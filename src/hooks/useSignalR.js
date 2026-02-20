import { useEffect, useRef, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';

const HUB_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/hubs/orders`;

/**
 * SignalR bağlantı hook'u.
 * @param {string|null} grup - Katılmak istenen grup adı (ör. 'garsonlar', 'mutfak', 'bar', 'dashboard')
 * @returns {{ connected: boolean, lastMessage: {type, data, ts}|null, connection: signalR.HubConnection|null }}
 */
export function useSignalR(grup = null) {
    const [connected, setConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const connectionRef = useRef(null);
    const grupRef = useRef(grup);
    grupRef.current = grup;

    const notify = useCallback((type, data) => {
        setLastMessage({ type, data, ts: Date.now() });
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('cafeml_token');

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(HUB_URL, {
                accessTokenFactory: () => token || ''
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000])
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        connectionRef.current = connection;

        // Olay dinleyicileri
        connection.on('YeniTalep', (data) => notify('YeniTalep', data));
        connection.on('YeniSiparis', (data) => notify('YeniSiparis', data));
        connection.on('SiparisOnaylandi', (data) => notify('SiparisOnaylandi', data));
        connection.on('TalepReddedildi', (data) => notify('TalepReddedildi', data));
        connection.on('SiparisTamamlandi', (data) => notify('SiparisTamamlandi', data));
        connection.on('DashboardGuncellendi', (data) => notify('DashboardGuncellendi', data));

        const joinGroup = async () => {
            if (grupRef.current) {
                try {
                    await connection.invoke('GrubaKatil', grupRef.current);
                } catch (e) {
                    // Sessizce geç — bazı hub'lar bu metodu desteklemeyebilir
                }
            }
        };

        connection
            .start()
            .then(async () => {
                setConnected(true);
                await joinGroup();
            })
            .catch((err) => {
                console.warn('[SignalR] Bağlantı kurulamadı:', err?.message ?? err);
            });

        connection.onreconnected(async () => {
            setConnected(true);
            await joinGroup();
        });

        connection.onclose(() => setConnected(false));

        return () => {
            if (grupRef.current && connection.state === signalR.HubConnectionState.Connected) {
                connection.invoke('GruptenAyril', grupRef.current).catch(() => {});
            }
            connection.stop();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return { connected, lastMessage, connection: connectionRef.current };
}
