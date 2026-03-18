import React, { useEffect, useRef } from 'react';

interface Props {
    roomName: string;
    displayName: string;
    onLeave: () => void;
}

export const JitsiMeetComponent: React.FC<Props> = ({ roomName, displayName, onLeave }) => {
    const jitsiContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load Jitsi script dynamically if not present
        if (!window.JitsiMeetExternalAPI) {
            const script = document.createElement('script');
            script.src = 'https://meet.jit.si/external_api.js';
            script.async = true;
            script.onload = initJitsi;
            document.body.appendChild(script);
        } else {
            initJitsi();
        }

        return () => {
            // Cleanup logic if needed (Jitsi usually handles this on iframe destruction)
        };
    }, []);

    const initJitsi = () => {
        if (!jitsiContainerRef.current) return;

        const domain = 'meet.jit.si';
        const options = {
            roomName: roomName,
            width: '100%',
            height: '100%',
            parentNode: jitsiContainerRef.current,
            userInfo: {
                displayName: displayName
            },
            configOverwrite: {
                startWithAudioMuted: false,
                startWithVideoMuted: false,
                prejoinPageEnabled: false // Skip Jitsi prejoin since we have our own
            },
            interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                    'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                    'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                    'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                    'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                    'security'
                ],
                SHOW_JITSI_WATERMARK: false,
            }
        };

        // @ts-ignore
        const api = new window.JitsiMeetExternalAPI(domain, options);

        api.addEventListeners({
            videoConferenceLeft: () => {
                onLeave();
                api.dispose();
            }
        });
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-black flex flex-col"
        >
            {/* Custom Header over Jitsi (optional) */}
            <div className="bg-slate-900 text-white px-4 py-2 flex justify-between items-center text-xs opacity-80 hover:opacity-100 transition-opacity">
                <span>Consultorio Virtual - Encriptado</span>
                <button onClick={onLeave} className="text-red-400 hover:text-red-300">Finalizar (Forzar)</button>
            </div>
            <div ref={jitsiContainerRef} className="flex-1 w-full h-full" />
        </div>
    );
};

// Add typescript definition for window
declare global {
    interface Window {
        JitsiMeetExternalAPI: any;
    }
}
