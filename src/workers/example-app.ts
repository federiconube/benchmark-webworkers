
// SDK
interface NubeSdkContext { }
interface NubeSdkUIDefinition { }

interface NubeSDK {
    convertSafeHTMLToUI(safeHtml: string): NubeSdkUIDefinition;

    getContext(): NubeSdkContext;

    onButtonClicked(id: string, action: () => void): void;
    onGetCheckoutUI(callback: () => NubeSdkUIDefinition): void;
}

// application
const sdk:NubeSDK = {
    convertSafeHTMLToUI(safeHtml: string): NubeSdkUIDefinition {
        return { type: "button", id: "pepe" };
    },

    getContext(): NubeSdkContext {
        return {};
    },

    onButtonClicked(id: string, action: () => void): void {
        
    },

    onGetCheckoutUI(callback: () => NubeSdkUIDefinition): void {
        
    }
};

sdk.onGetCheckoutUI(() => sdk.convertSafeHTMLToUI("<button id='pepe'>Hello World</button"));
sdk.onButtonClicked("pepe", () => { 
    // do something
});


