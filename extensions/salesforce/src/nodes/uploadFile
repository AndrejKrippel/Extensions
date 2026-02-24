"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onErrorUploadFile = exports.onSuccessUploadFile = exports.uploadFileNode = void 0;
const extension_tools_1 = require("@cognigy/extension-tools");
const authenticate_1 = require("../authenticate");
exports.uploadFileNode = extension_tools_1.createNodeDescriptor({
    type: "uploadFile",
    defaultLabel: {
        deDE: "Datei hochladen",
        default: "Upload File"
    },
    summary: {
        deDE: "Lade eine Datei in Salesforce hoch",
        default: "Upload a file to Salesforce"
    },
    fields: [
        {
            key: "oauthConnection",
            label: {
                deDE: "Salesforce Connected App",
                default: "Salesforce Connected App",
            },
            type: "connection",
            params: {
                connectionType: "oauth",
                required: true
            }
        },
        {
            key: "fileData",
            type: "cognigyText",
            label: {
                deDE: "Datei Daten",
                default: "File Data",
            },
            params: {
                required: true
            },
        },
        {
            key: "fileName",
            type: "cognigyText",
            label: {
                deDE: "Datei Name",
                default: "File Name",
            },
            params: {
                required: true
            },
        },
        {
            key: "fileDescription",
            type: "cognigyText",
            label: {
                deDE: "Datei Beschreibung",
                default: "File Description",
            },
            defaultValue: "",
            params: {
                required: false
            },
        },
        {
            key: "storeLocation",
            type: "select",
            label: {
                deDE: "Ergebnisspeicherung",
                default: "Where to store the result"
            },
            defaultValue: "input",
            params: {
                options: [
                    {
                        label: "Input",
                        value: "input"
                    },
                    {
                        label: "Context",
                        value: "context"
                    }
                ],
                required: true
            }
        },
        {
            key: "inputKey",
            type: "text",
            label: {
                deDE: "Input Schlüssel für Ergebnisspeicherung",
                default: "Input Key to store Result"
            },
            defaultValue: "salesforce.file",
            condition: {
                key: "storeLocation",
                value: "input"
            }
        },
        {
            key: "contextKey",
            type: "text",
            label: {
                deDE: "Context Schlüssel für Ergebnisspeicherung",
                default: "Context Key to store Result"
            },
            defaultValue: "salesforce.file",
            condition: {
                key: "storeLocation",
                value: "context"
            }
        },
    ],
    sections: [
        {
            key: "storage",
            label: {
                deDE: "Ergebnisspeicherung",
                default: "Result Storage"
            },
            defaultCollapsed: true,
            fields: [
                "storeLocation",
                "inputKey",
                "contextKey",
            ]
        }
    ],
    form: [
        { type: "field", key: "oauthConnection" },
        { type: "field", key: "fileData" },
        { type: "field", key: "fileName" },
        { type: "field", key: "fileDescription" },
        { type: "section", key: "storage" }
    ],
    appearance: {
        color: "#009EDB"
    },
    dependencies: {
        children: [
            "onSuccessUploadFile",
            "onErrorUploadFile"
        ]
    },
    function: async ({ cognigy, config, childConfigs }) => {
        const { api } = cognigy;
        const { oauthConnection, fileData, fileName, fileDescription, storeLocation, contextKey, inputKey } = config;
        try {
            const salesforceConnection = await authenticate_1.authenticate(oauthConnection);
            const payload = {
                Title: fileName,
                PathOnClient: fileName,
                Description: fileDescription || "",
                VersionData: fileData
            };
            const record = await salesforceConnection.sobject("ContentVersion").create(payload);
            const onSuccessChild = childConfigs.find(child => child.type === "onSuccessUploadFile");
            api.setNextNode(onSuccessChild.id);
            if (storeLocation === "context") {
                api.addToContext(contextKey, record, "simple");
            }
            else {
                // @ts-ignore
                api.addToInput(inputKey, record);
            }
        }
        catch (error) {
            const onErrorChild = childConfigs.find(child => child.type === "onErrorUploadFile");
            api.setNextNode(onErrorChild.id);
            if (storeLocation === "context") {
                api.addToContext(contextKey, error.message, "simple");
            }
            else {
                // @ts-ignore
                api.addToInput(inputKey, error.message);
            }
        }
    }
});
exports.onSuccessUploadFile = extension_tools_1.createNodeDescriptor({
    type: "onSuccessUploadFile",
    parentType: "uploadFile",
    defaultLabel: "On Success",
    constraints: {
        editable: false,
        deletable: false,
        creatable: false,
        movable: false,
        placement: {
            predecessor: {
                whitelist: []
            }
        }
    },
    appearance: {
        color: "#61d188",
        textColor: "white",
        variant: "mini",
        showIcon: false
    }
});
exports.onErrorUploadFile = extension_tools_1.createNodeDescriptor({
    type: "onErrorUploadFile",
    parentType: "uploadFile",
    defaultLabel: "On Error",
    constraints: {
        editable: false,
        deletable: false,
        creatable: false,
        movable: false,
        placement: {
            predecessor: {
                whitelist: []
            }
        }
    },
    appearance: {
        color: "#cf142b",
        textColor: "white",
        variant: "mini",
        showIcon: false
    }
});
//# sourceMappingURL=uploadFile.js.map
