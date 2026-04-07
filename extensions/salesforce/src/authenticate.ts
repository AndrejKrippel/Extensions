import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

interface IConnection {
    oauthConnection: {
        consumerKey: string;
        consumerSecret: string;
        instanceUrl: string;
    };
}

export interface ISalesforceQueryResult {
    totalSize?: number;
    done?: boolean;
    records: any[];
    nextRecordsUrl?: string;
}

export interface ISalesforceClient {
    accessToken: string;
    instanceUrl: string;
    apiVersion: string;
    request: (config: AxiosRequestConfig) => Promise<AxiosResponse>;
    query: (
        soql: string,
        options?: { autoFetch?: boolean; maxFetch?: number }
    ) => Promise<ISalesforceQueryResult>;
    sobject: (entityType: string) => {
        create: (record: any) => Promise<any>;
        retrieve: (id: string) => Promise<any>;
        update: (record: any) => Promise<any>;
        destroy: (id: string) => Promise<any>;
    };
}

/* -------------------------------------------------------------------------- */
/*                           Token Cache & Helpers                             */
/* -------------------------------------------------------------------------- */

interface ICachedSalesforceToken {
    accessToken: string;
    instanceUrl: string;
    apiVersion: string;
    issuedAt: number;
}

/**
 * In‑memory token cache (runtime‑scoped, Cognigy‑safe)
 */
let cachedSalesforceToken: ICachedSalesforceToken | null = null;

/**
 * Conservative TTL for client‑credentials tokens
 */
const SALESFORCE_TOKEN_TTL_MS = 15 * 60 * 1000;

const isTokenValid = (
    instanceUrl: string,
    apiVersion: string
): boolean => {
    if (!cachedSalesforceToken) {
        return false;
    }

    if (
        cachedSalesforceToken.instanceUrl !== instanceUrl ||
        cachedSalesforceToken.apiVersion !== apiVersion
    ) {
        return false;
    }

    const age = Date.now() - cachedSalesforceToken.issuedAt;
    return age < SALESFORCE_TOKEN_TTL_MS;
};

export const getCachedSalesforceToken = () => cachedSalesforceToken;

/* -------------------------------------------------------------------------- */
/*                      Salesforce Client Factory                              */
/* -------------------------------------------------------------------------- */

const createSalesforceClient = (
    token: ICachedSalesforceToken
): ISalesforceClient => {

    const { accessToken, instanceUrl, apiVersion } = token;

    const http = axios.create({
        baseURL: instanceUrl,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        }
    });

    const request = (config: AxiosRequestConfig) => http.request(config);

    const query = async (
        soql: string,
        options?: { autoFetch?: boolean; maxFetch?: number }
    ): Promise<ISalesforceQueryResult> => {

        const autoFetch = Boolean(options?.autoFetch);
        const maxFetch = Number(options?.maxFetch ?? 0);
        let fetchCount = 0;

        const runQuery = async (
            url: string,
            params?: Record<string, string>
        ) => {
            fetchCount += 1;
            const response = await http.get(url, params ? { params } : undefined);
            return response.data;
        };

        const firstResponse = await runQuery(
            `/services/data/v${apiVersion}/query`,
            { q: soql }
        );

        let records: any[] = firstResponse?.records ?? [];
        let done = Boolean(firstResponse?.done);
        let nextRecordsUrl: string | undefined = firstResponse?.nextRecordsUrl;
        let totalSize: number | undefined =
            firstResponse?.totalSize ?? records.length;

        if (autoFetch) {
            while (
                !done &&
                nextRecordsUrl &&
                (maxFetch <= 0 || fetchCount < maxFetch)
            ) {
                const nextResponse = await runQuery(nextRecordsUrl);
                records = records.concat(nextResponse?.records ?? []);
                done = Boolean(nextResponse?.done);
                nextRecordsUrl = nextResponse?.nextRecordsUrl;
                totalSize = nextResponse?.totalSize ?? totalSize;
            }
        }

        return {
            ...firstResponse,
            records,
            done,
            nextRecordsUrl,
            totalSize
        };
    };

    const sobject = (entityType: string) => {
        const encodedType = encodeURIComponent(entityType);

        return {
            create: async (record: any) => {
                const response = await http.post(
                    `/services/data/v${apiVersion}/sobjects/${encodedType}/`,
                    record
                );
                return response.data;
            },
            retrieve: async (id: string) => {
                const response = await http.get(
                    `/services/data/v${apiVersion}/sobjects/${encodedType}/${encodeURIComponent(id)}`
                );
                return response.data;
            },
            update: async (record: any) => {
                const { Id, id, ...rest } = record || {};
                const recordId = Id || id;

                if (!recordId) {
                    throw new Error("Salesforce update requires a record Id.");
                }

                await http.patch(
                    `/services/data/v${apiVersion}/sobjects/${encodedType}/${encodeURIComponent(recordId)}`,
                    rest
                );

                return { id: recordId, success: true, errors: [] };
            },
            destroy: async (id: string) => {
                await http.delete(
                    `/services/data/v${apiVersion}/sobjects/${encodedType}/${encodeURIComponent(id)}`
                );
                return { id, success: true, errors: [] };
            }
        };
    };

    return {
        accessToken,
        instanceUrl,
        apiVersion,
        request,
        query,
        sobject
    };
};

/* -------------------------------------------------------------------------- */
/*                               Authentication                               */
/* -------------------------------------------------------------------------- */

export const authenticate = async (
    oauthConnection: IConnection["oauthConnection"],
    apiVersion: string = "62.0"
): Promise<ISalesforceClient> => {

    const { consumerKey, consumerSecret, instanceUrl } = oauthConnection;
    const salesforceAPIVersion = apiVersion || "62.0";

    /**
     * Silent token reuse
     */
    if (isTokenValid(instanceUrl, salesforceAPIVersion)) {
        return createSalesforceClient(cachedSalesforceToken as ICachedSalesforceToken);
    }

    const data =
        `grant_type=client_credentials` +
        `&client_id=${encodeURIComponent(consumerKey)}` +
        `&client_secret=${encodeURIComponent(consumerSecret)}`;

    const authResponse = await axios.post(
        `${instanceUrl}/services/oauth2/token`,
        data,
        {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        }
    );

    const accessToken = authResponse?.data?.access_token;

    if (!accessToken) {
        throw new Error("Salesforce authentication failed: missing access token.");
    }

    cachedSalesforceToken = {
        accessToken,
        instanceUrl,
        apiVersion: salesforceAPIVersion,
        issuedAt: Date.now()
    };

    return createSalesforceClient(cachedSalesforceToken);
};
