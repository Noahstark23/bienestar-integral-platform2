const timestamp = () => new Date().toISOString();

const logger = {
    info: (message) => {
        console.log(`[${timestamp()}] [INFO]  ${message}`);
    },
    warn: (message) => {
        console.warn(`[${timestamp()}] [WARN]  ${message}`);
    },
    error: (message, err) => {
        console.error(`[${timestamp()}] [ERROR] ${message}`);
        if (err instanceof Error) {
            console.error(`[${timestamp()}] [STACK] ${err.stack}`);
        }
    }
};

export default logger;
