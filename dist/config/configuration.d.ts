declare const _default: () => {
    port: number;
    jwt: {
        secret: string | undefined;
        expiresIn: string;
    };
    database: {
        host: string;
        port: number;
        username: string;
        password: string;
        name: string;
    };
};
export default _default;
