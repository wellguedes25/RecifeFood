import { useEffect, useRef } from 'react'

function StoreMap({ stores, userLocation, onSelectStore }) {
    const mapRef = useRef(null)
    const containerRef = useRef(null)

    useEffect(() => {
        const L = window.L
        if (!L || !containerRef.current) return

        if (!mapRef.current) {
            const center = userLocation ? [userLocation.lat, userLocation.lng] : [-8.0578, -34.8829]

            mapRef.current = L.map(containerRef.current, {
                zoomControl: false,
                scrollWheelZoom: true
            }).setView(center, 14)

            L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(mapRef.current)
        }

        // Custom Icon Creation
        const createStoreIcon = (price) => {
            return L.divIcon({
                html: `
                    <div style="
                        background: white; 
                        padding: 4px 8px; 
                        border-radius: 12px; 
                        border: 2px solid #DDA63A; 
                        box-shadow: 0 4px 12px rgba(221, 166, 58, 0.3);
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        white-space: nowrap;
                        animation: popIn 0.3s ease-out;
                    ">
                        <div style="background: #DDA63A; border-radius: 6px; padding: 4px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/>
                            </svg>
                        </div>
                        <span style="color: #4C9F38; font-weight: 900; font-size: 11px; font-family: 'Inter', sans-serif;">R$ ${price}</span>
                    </div>
                `,
                className: 'custom-map-marker',
                iconSize: [80, 40],
                iconAnchor: [40, 20]
            })
        }

        const createUserIcon = () => {
            return L.divIcon({
                html: `
                    <div style="width: 20px; height: 20px; background: #3B82F6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); position: relative;">
                        <div style="position: absolute; inset: -10px; background: rgba(59, 130, 246, 0.2); border-radius: 50%; animation: pulseLocation 2s infinite;"></div>
                    </div>
                `,
                className: 'user-location-marker',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }

        // Clear existing markers
        mapRef.current.eachLayer((layer) => {
            if (layer instanceof L.Marker) mapRef.current.removeLayer(layer)
        })

        // Add User Marker
        if (userLocation) {
            L.marker([userLocation.lat, userLocation.lng], { icon: createUserIcon() })
                .addTo(mapRef.current)
                .bindPopup('<b style="font-family: sans-serif;">Você está aqui!</b>')
        }

        // Add Store Markers
        stores?.filter(s => s.latitude && s.longitude).forEach(store => {
            const price = store.bags?.[0]?.discounted_price?.toFixed(2) || "0.00"
            const marker = L.marker([store.latitude, store.longitude], { icon: createStoreIcon(price) })
                .addTo(mapRef.current)

            const popupContent = `
                <div style="font-family: 'Inter', sans-serif; min-width: 160px; text-align: left; padding: 4px;">
                    <div style="color: #999; font-size: 9px; font-weight: 900; text-transform: uppercase; margin-bottom: 2px;">Estabelecimento</div>
                    <h4 style="margin: 0; font-weight: 900; font-size: 14px; color: #111; line-height: 1.2;">${store.name}</h4>
                    <div style="display: flex; align-items: center; gap: 4px; margin: 8px 0;">
                         <span style="color: #4C9F38; font-weight: 900; font-size: 16px;">R$ ${price}</span>
                         <span style="color: #999; font-size: 10px; font-weight: bold;">• ${store.category}</span>
                    </div>
                    <button id="map-btn-${store.id}" style="
                        width: 100%; 
                        background: #DDA63A; 
                        color: white; 
                        border: none; 
                        padding: 10px; 
                        border-radius: 12px; 
                        font-weight: 900; 
                        cursor: pointer; 
                        font-size: 11px; 
                        text-transform: uppercase;
                        box-shadow: 0 4px 10px rgba(221, 166, 58, 0.2);
                        transition: all 0.2s;
                    ">Ver Ofertas</button>
                    <div style="text-align: center; margin-top: 8px;">
                        <span style="font-size: 9px; color: #EA580C; font-weight: 900; background: #FFF7ED; padding: 2px 8px; border-radius: 6px;">🔥 Retira Hoje</span>
                    </div>
                </div>
            `
            marker.bindPopup(popupContent, {
                className: 'custom-leaflet-popup',
                maxWidth: 250
            })

            marker.on('popupopen', () => {
                const btn = document.getElementById(`map-btn-${store.id}`)
                if (btn) btn.onclick = () => onSelectStore(store)
            })
        })
    }, [stores, userLocation, onSelectStore])

    useEffect(() => {
        return () => {
            if (mapRef.current) {
                mapRef.current.remove()
                mapRef.current = null
            }
        }
    }, [])

    return (
        <div className="w-full h-full relative bg-gray-200">
            <div ref={containerRef} className="absolute inset-0 z-0" />

            {/* Animations & Styles injected for custom icons */}
            <style>{`
                @keyframes popIn {
                    from { transform: scale(0.5); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes pulseLocation {
                    0% { transform: scale(1); opacity: 0.5; }
                    100% { transform: scale(2.5); opacity: 0; }
                }
                .custom-leaflet-popup .leaflet-popup-content-wrapper {
                    border-radius: 24px;
                    padding: 8px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
                }
                .custom-leaflet-popup .leaflet-popup-tip {
                    background: white;
                }
                .leaflet-div-icon {
                    background: transparent !important;
                    border: none !important;
                }
             `}</style>

            <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <div className="bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-white/40 pointer-events-auto">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-secondary rounded-full animate-ping"></div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Mapa Dinâmico</p>
                    </div>
                    <h3 className="text-sm font-black text-gray-900 italic mt-0.5">Recife • PE</h3>
                </div>
            </div>
        </div>
    )
}

export default StoreMap
