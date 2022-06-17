import { Property } from 'ts-convict';

export class BootstrapConfig {
    @Property({
        default: '0.0.0.0',
        env: 'P2P_LISTEN_IP',
        format: String,
    })
    public listenIp: string;

    @Property({
        default: '23456',
        env: 'P2P_LISTEN_PORT',
        format: String,
    })
    public listenPort: string;
}
