import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'
import { MapPin, ShoppingBag, Store, CreditCard, Flame, Heart, Navigation, CheckCircle2, LogOut, User as UserIcon, ArrowRight, Search, Star, Bell, BellRing, MessageSquare, X, Loader2, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import Login from './components/Login'
import StoreDetails from './components/StoreDetails'
import StoreMap from './components/StoreMap'
import UserProfile from './components/UserProfile'
import AdminPanel from './components/AdminPanel'
import AdminPanelWeb from './components/AdminPanelWeb'
import SuperAdminPanel from './components/SuperAdminPanel'
import SuperAdminPanelWeb from './components/SuperAdminPanelWeb'
import CheckoutModal from './components/CheckoutModal'
import PlatformSelector from './components/PlatformSelector'


function App() {
    const [establishments, setEstablishments] = useState([])
    const [loading, setLoading] = useState(true)
    const [favorites, setFavorites] = useState([])
    const [selectedBag, setSelectedBag] = useState(null)
    const [selectedStore, setSelectedStore] = useState(null)
    const [showProfile, setShowProfile] = useState(false)
    const [userStatus, setUserStatus] = useState('loading') // 'loading', 'landing', 'main'
    const [currentTab, setCurrentTab] = useState('Explorar') // 'Explorar', 'Sacolas', 'Mapa'
    const [userLocation, setUserLocation] = useState(null)
    const [userData, setUserData] = useState(null)
    const [selectedCategory, setSelectedCategory] = useState('Todos')
    const [selectedDietary, setSelectedDietary] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [ratingOrder, setRatingOrder] = useState(null)
    const [ratingValue, setRatingValue] = useState(5)
    const [ratingComment, setRatingComment] = useState('')
    const [isSubmittingReview, setIsSubmittingReview] = useState(false)
    const [orderSuccess, setOrderSuccess] = useState(false)
    const [reviewSuccess, setReviewSuccess] = useState(false)
    const [confirmOrder, setConfirmOrder] = useState(null)
    const [showLocationModal, setShowLocationModal] = useState(false)
    const [session, setSession] = useState(null)
    const [orders, setOrders] = useState([])
    const [selectedOrderForChat, setSelectedOrderForChat] = useState(null)
    const [checkoutItems, setCheckoutItems] = useState(null)
    const [viewMode, setViewMode] = useState('auto') // 'auto', 'app', 'web'
    const [locationName, setLocationName] = useState('Localizando...')

    useEffect(() => {
        const init = async () => {
            console.log('Iniciando App...')
            try {
                const { data, error } = await supabase.auth.getSession()
                if (error) throw error

                const session = data?.session
                setSession(session)

                if (session) {
                    console.log('Sessão encontrada, buscando dados...')
                    await fetchUserProfile(session.user.id, session.user)
                    await fetchOrders(session.user.id)
                    setUserStatus('main')
                } else {
                    console.log('Nenhuma sessão encontrada.')
                    setUserStatus('landing')
                }
            } catch (error) {
                console.error('Erro no init:', error)
                setUserStatus('landing')
            } finally {
                fetchData()
            }
        }

        init()

        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log('Mudança de Auth:', _event)
            setSession(session)
            if (session) {
                fetchUserProfile(session.user.id, session.user)
                fetchOrders(session.user.id)
                setUserStatus('main')
            } else {
                setUserStatus('landing')
                setUserData(null)
                setOrders([])
            }
        })

        const savedFavorites = localStorage.getItem('favorites')
        if (savedFavorites) setFavorites(JSON.parse(savedFavorites))

        return () => authListener?.subscription.unsubscribe()
    }, [])

    const fetchUserProfile = async (userId, authUser = null) => {
        try {
            // 1. Get database profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            // 2. Use provided authUser or fetch it (fallback)
            let user = authUser
            if (!user) {
                const { data: userData } = await supabase.auth.getUser()
                user = userData?.user
            }

            let finalRole = profileData?.role || 'customer'

            // Critical Fallback: Ensure the main admin always has access
            if (user?.email === 'wellguedes@gmail.com') {
                finalRole = 'superadmin'
            }

            const mergedData = {
                id: userId,
                email: user?.email,
                full_name: profileData?.full_name || user?.user_metadata?.full_name,
                cpf: profileData?.cpf || user?.user_metadata?.cpf,
                phone: profileData?.phone || user?.user_metadata?.phone,
                avatar_url: profileData?.avatar_url,
                role: finalRole,
                establishment_id: profileData?.establishment_id,
                created_at: profileData?.created_at || user?.created_at
            }

            console.log('User Profile Loaded:', { email: mergedData.email, role: mergedData.role })
            setUserData(mergedData)
        } catch (error) {
            console.error('Error fetching profile:', error)
        }
    }

    const fetchOrders = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    bags(*, establishments(*)),
                    reviews(*)
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
            if (data) setOrders(data)
        } catch (error) {
            console.error('Error fetching orders:', error)
        }
    }

    const handleConfirmCollection = async () => {
        if (!confirmOrder) return
        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    status: 'completed',
                    customer_confirmed: true
                })
                .eq('id', confirmOrder.id)

            if (error) throw error

            setConfirmOrder(null)
            setReviewSuccess(true)
            setTimeout(() => setReviewSuccess(false), 4000)
            fetchOrders(session.user.id)
        } catch (error) {
            console.error('Erro ao confirmar:', error)
            alert('Erro ao confirmar o recebimento.')
        }
    }

    const checkStoreStatus = (operatingHours) => {
        if (!operatingHours) return true // Default to open if no hours set

        const now = new Date()
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        const today = days[now.getDay()]
        const hours = operatingHours[today]

        if (!hours || hours.closed) return false

        const currentTime = now.getHours() * 60 + now.getMinutes()
        const [openH, openM] = hours.open.split(':').map(Number)
        const [closeH, closeM] = hours.close.split(':').map(Number)

        const openTime = openH * 60 + openM
        const closeTime = closeH * 60 + closeM

        return currentTime >= openTime && currentTime <= closeTime
    }

    const fetchData = async () => {
        setLoading(true)
        console.log('Buscando estabelecimentos...')
        try {
            // Fetch establishments - removed is_open: true for debugging visibility
            const { data, error } = await supabase
                .from('establishments')
                .select(`
                    *,
                    bags(*)
                `)

            if (error) throw error
            if (data) {
                console.log(`${data.length} estabelecimentos encontrados.`)
                setEstablishments(data)
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const toggleFavorite = (e, storeId) => {
        e.stopPropagation()
        setFavorites(prev => {
            const next = prev.includes(storeId)
                ? prev.filter(id => id !== storeId)
                : [...prev, storeId]
            localStorage.setItem('favorites', JSON.stringify(next))
            return next
        })
    }

    const requestLocation = (callback) => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const loc = { lat: position.coords.latitude, lng: position.coords.longitude }
                    setUserLocation(loc)

                    // Reverse geocoding to get city name
                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}&zoom=10`)
                        const data = await response.json()
                        const city = data.address.city || data.address.town || data.address.village || 'Sua Região'
                        const state = data.address.state ? `, ${data.address.state_code || data.address.state.slice(0, 2).toUpperCase()}` : ''
                        setLocationName(`${city}${state}`)
                    } catch (err) {
                        setLocationName('Localização Ativa')
                    }

                    if (callback) callback(loc)
                },
                (error) => {
                    console.log("Erro ao pegar localização:", error)
                    setLocationName('Recife, PE') // Fallback
                }
            )
        }
    }

    const confirmLocationPermission = () => {
        setShowLocationModal(false)
        requestLocation()
    }

    const denyLocationPermission = () => {
        setShowLocationModal(false)
    }

    const handleGuestAccess = () => {
        setUserStatus('main')
        setTimeout(() => setShowLocationModal(true), 1000)
    }

    const handlePlaceOrder = (items) => {
        if (!session) {
            alert('Por favor, faça login para realizar o pedido.')
            setUserStatus('landing')
            return
        }
        setCheckoutItems(items)
    }

    const handleConfirmCheckout = async () => {
        try {
            await fetchOrders(session.user.id)
            setCheckoutItems(null) // Fecha o modal de checkout
            setOrderSuccess(true)

            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#DDA63A', '#EF7E22', '#22C55E']
            })

            setTimeout(() => {
                setOrderSuccess(false)
                setSelectedStore(null)
            }, 3000)

        } catch (error) {
            console.error('Erro ao finalizar checkout:', error)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        setUserStatus('landing')
        setUserData(null)
        setSession(null)
        setShowProfile(false)
        setViewMode('auto')
    }

    if (userStatus === 'loading') {
        return (
            <div className="min-h-screen bg-surface-soft flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        )
    }

    return (
        <div className={`min-h-screen bg-surface-soft flex justify-center ${viewMode === 'web' ? 'p-0 overflow-auto' : ''}`}>
            <div className={`${viewMode === 'web' ? 'w-full min-h-screen' : 'w-full max-w-2xl bg-white shadow-2xl min-h-screen'} relative flex flex-col overflow-hidden`}>
                <AnimatePresence mode="wait">
                    {userStatus === 'landing' ? (
                        <Login
                            key="landing"
                            onLogin={(user) => {
                                // Session is handled by onAuthStateChange
                            }}
                            onGuest={handleGuestAccess}
                        />
                    ) : userData && (userData.role === 'superadmin' || userData.role === 'merchant') && viewMode === 'auto' ? (
                        <PlatformSelector
                            userData={userData}
                            role={userData.role}
                            onSelect={(choice) => setViewMode(choice)}
                        />
                    ) : userData?.role === 'superadmin' ? (
                        viewMode === 'web' ? (
                            <SuperAdminPanelWeb
                                userData={userData}
                                onLogout={handleLogout}
                                onSwitchMode={() => setViewMode('app')}
                            />
                        ) : (
                            <SuperAdminPanel
                                userData={userData}
                                onLogout={handleLogout}
                                viewMode={viewMode}
                            />
                        )
                    ) : userData?.role === 'merchant' ? (
                        viewMode === 'web' ? (
                            <AdminPanelWeb
                                userData={userData}
                                onLogout={handleLogout}
                                onSwitchMode={() => setViewMode('app')}
                            />
                        ) : (
                            <AdminPanel
                                userData={userData}
                                onLogout={handleLogout}
                                viewMode={viewMode}
                            />
                        )
                    ) : (
                        <motion.div
                            key="main"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex-1 flex flex-col min-h-screen pb-32"
                        >
                            <header className="bg-[#DDA63A] p-4 sticky top-0 z-40 shadow-sm">
                                <div className="flex items-center justify-between max-w-2xl mx-auto">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-white p-1 rounded-lg shadow-sm">
                                            <img src="/logo.png" alt="Recife Save Logo" className="w-8 h-8 object-contain" />
                                        </div>
                                        <h1 className="text-xl font-black tracking-tight text-white italic">Recife Save</h1>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="hidden sm:flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-lg shadow-black/10 border border-primary/20">
                                            <Navigation className="w-3 h-3 text-primary" fill="currentColor" />
                                            <span className="text-[11px] font-black text-gray-800 tracking-wide uppercase">{locationName || 'Recife, PE'}</span>
                                        </div>
                                        <button
                                            onClick={() => setShowProfile(true)}
                                            className="bg-white/20 backdrop-blur-md p-2 rounded-xl text-white hover:bg-white hover:text-primary transition-all active:scale-95"
                                        >
                                            <UserIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </header>

                            <main className={`flex-1 w-full relative ${currentTab === 'Mapa' ? 'overflow-hidden' : 'overflow-y-auto'} `}>
                                <AnimatePresence mode="wait">
                                    {currentTab === 'Explorar' && (
                                        <motion.section
                                            key="explorar"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="p-4 space-y-6"
                                        >
                                            <div className="px-2 pt-2 flex items-center justify-between">
                                                <div>
                                                    <h2 className="text-2xl font-black text-gray-900 italic">Olá, {userData?.full_name?.split(' ')[0] || 'Herói'}! 👋</h2>
                                                    <p className="text-gray-500 font-bold text-sm">Como vamos combater o desperdício hoje?</p>
                                                </div>
                                            </div>

                                            {/* Search Bar */}
                                            <div className="px-2">
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
                                                        <Search className="w-5 h-5 text-gray-400 group-focus-within:text-primary" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar estabelecimentos..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="w-full bg-surface-soft border-2 border-transparent p-4 pl-12 rounded-[24px] font-bold text-gray-700 outline-none focus:border-primary/20 focus:bg-white transition-all shadow-sm"
                                                    />
                                                </div>
                                            </div>

                                            <div className="bg-gradient-to-br from-[#DDA63A] to-[#EF7E22] rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden">
                                                <div className="relative z-10">
                                                    <h2 className="text-2xl font-black mb-2 leading-tight">Garantindo o Alimento,<br />Combatendo o Desperdício.</h2>
                                                    <p className="text-white/90 text-sm font-medium italic">Inspirado nos objetivos mundiais da ONU.</p>
                                                </div>
                                                <Flame className="absolute top-0 right-0 -mr-8 -mt-8 opacity-20 w-40 h-40" fill="currentColor" />
                                            </div>

                                            {/* Promoted Highlights (Native Ads) */}
                                            {establishments.filter(s => s.is_promoted).length > 0 && (
                                                <div className="space-y-4">
                                                    <div className="px-2 flex items-center justify-between">
                                                        <h3 className="text-sm font-black uppercase italic flex items-center gap-2">
                                                            <Zap size={16} className="text-yellow-500 fill-yellow-500" /> Destaques da Semana
                                                        </h3>
                                                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Patrocinado</span>
                                                    </div>
                                                    <div className="flex gap-4 overflow-x-auto pb-4 px-2 scrollbar-none">
                                                        {establishments.filter(s => s.is_promoted).map(store => (
                                                            <button
                                                                key={store.id}
                                                                onClick={() => setSelectedStore(store)}
                                                                className="w-72 shrink-0 bg-white rounded-[32px] p-4 border border-yellow-100 shadow-sm hover:shadow-md transition-all group"
                                                            >
                                                                <div className="flex items-center gap-4 text-left">
                                                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center text-yellow-600 font-black relative">
                                                                        <Store size={24} />
                                                                        <div className="absolute -top-1 -right-1 bg-yellow-400 text-white p-1 rounded-full shadow-sm">
                                                                            <Zap size={8} fill="currentColor" />
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <h4 className="font-black text-xs uppercase text-gray-900 group-hover:text-primary transition-colors">{store.name}</h4>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className="text-[8px] font-black bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-md uppercase">Top Parceiro</span>
                                                                            <p className="text-lg font-black text-primary italic">R$ {store.bags?.[0]?.discounted_price?.toFixed(2) || '0.00'}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Categories */}
                                            <div className="flex gap-4 overflow-x-auto pb-4 px-2 scrollbar-none">
                                                {['Todos', 'Supermercados', 'Padarias', 'Docerias'].map((cat) => (
                                                    <button key={cat} onClick={() => setSelectedCategory(cat)} className="flex flex-col items-center gap-2 shrink-0">
                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${selectedCategory === cat ? 'bg-primary text-white' : 'bg-white border text-gray-400'} `}>
                                                            {cat === 'Todos' ? <ShoppingBag /> : <Store />}
                                                        </div>
                                                        <span className="text-[11px] font-bold">{cat}</span>
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Dietary Filters */}
                                            <div className="flex gap-2 overflow-x-auto pb-4 px-2 scrollbar-none">
                                                {['Vegano', 'Sem Glúten', 'Zero Lactose'].map((filter) => (
                                                    <button
                                                        key={filter}
                                                        onClick={() => {
                                                            setSelectedDietary(prev =>
                                                                prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
                                                            )
                                                        }}
                                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border-2 shrink-0 ${selectedDietary.includes(filter) ? 'bg-secondary/10 border-secondary text-secondary shadow-sm' : 'bg-white border-gray-100 text-gray-400'} `}
                                                    >
                                                        {filter}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Stores List */}
                                            <div className="space-y-4 px-2 pb-8">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-lg font-black text-gray-800">Próximos a você 🔥</h3>
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                        {establishments.filter(s => (selectedCategory === 'Todos' || s.category === selectedCategory) && s.name.toLowerCase().includes(searchTerm.toLowerCase())).length} resultados
                                                    </span>
                                                </div>

                                                {establishments
                                                    .filter(store => {
                                                        const matchesCategory = selectedCategory === 'Todos' || store.category === selectedCategory
                                                        const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase())

                                                        // Filter by dietary tags in any of the store's bags
                                                        const matchesDietary = selectedDietary.length === 0 || store.bags?.some(bag =>
                                                            selectedDietary.every(filter => bag.dietary_filters?.includes(filter))
                                                        )

                                                        return matchesCategory && matchesSearch && matchesDietary
                                                    })
                                                    .map((store) => (
                                                        <div key={store.id} onClick={() => setSelectedStore(store)} className="group bg-white rounded-[24px] p-4 border border-gray-100 shadow-sm flex gap-4 cursor-pointer hover:border-primary/20 hover:shadow-md transition-all active:scale-98">
                                                            <div className="w-20 h-20 bg-surface-soft rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-primary/5 transition-colors">
                                                                <Store className="text-primary w-8 h-8" />
                                                            </div>
                                                            <div className="flex-1 text-left">
                                                                <div className="flex items-center justify-between">
                                                                    <h4 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{store.name}</h4>
                                                                    <ArrowRight size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                                                </div>
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    <p className="text-[10px] text-secondary font-black uppercase tracking-tighter mr-2">{store.category}</p>
                                                                    {store.is_promoted && (
                                                                        <span className="text-[7px] font-black bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded-md uppercase flex items-center gap-0.5">
                                                                            <Zap size={6} fill="currentColor" /> Impulsionado
                                                                        </span>
                                                                    )}
                                                                    {Array.from(new Set(store.bags?.flatMap(b => b.dietary_filters || []))).map(tag => (
                                                                        <span key={tag} className="text-[7px] font-black bg-green-50 text-green-600 px-1.5 py-0.5 rounded-md uppercase">{tag}</span>
                                                                    ))}
                                                                </div>
                                                                <div className="flex items-center justify-between mt-2">
                                                                    <p className="text-lg font-black text-primary italic">R$ {store.bags?.[0]?.discounted_price?.toFixed(2) || '0.00'}</p>
                                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                                                                        <MapPin size={10} />
                                                                        <span>1.2km</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}

                                                {establishments.filter(store => {
                                                    const matchesCategory = selectedCategory === 'Todos' || store.category === selectedCategory
                                                    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase())
                                                    return matchesCategory && matchesSearch
                                                }).length === 0 && (
                                                        <div className="py-20 text-center space-y-4">
                                                            <div className="bg-surface-soft w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                                                                <Search size={24} className="text-gray-300" />
                                                            </div>
                                                            <p className="text-gray-400 font-bold uppercase text-xs">Nenhum estabelecimento encontrado com "{searchTerm}"</p>
                                                        </div>
                                                    )}
                                            </div>
                                        </motion.section>
                                    )}

                                    {currentTab === 'Mapa' && (
                                        <div className="flex-1 w-full h-full min-h-[500px] relative">
                                            <StoreMap
                                                stores={establishments}
                                                userLocation={userLocation}
                                                onSelectStore={(store) => setSelectedStore(store)}
                                                locationName={locationName}
                                            />
                                        </div>
                                    )}

                                    {currentTab === 'Sacolas' && (
                                        <div className="flex-1 p-4 space-y-6">
                                            <div className="px-2 pt-2">
                                                <h2 className="text-2xl font-black text-gray-900 italic uppercase">Minhas Reservas</h2>
                                                <p className="text-gray-500 font-bold text-sm">Acompanhe suas sacolas salvas.</p>
                                            </div>

                                            {orders.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
                                                    <div className="bg-surface-soft w-24 h-24 rounded-[32px] flex items-center justify-center mb-6">
                                                        <ShoppingBag className="w-12 h-12 text-gray-200" />
                                                    </div>
                                                    <h3 className="text-xl font-black text-gray-300 italic uppercase">Nada por aqui</h3>
                                                    <p className="text-gray-400 text-xs font-bold uppercase mt-2 max-w-[200px]">Você ainda não salvou nenhum alimento hoje.</p>
                                                    <button
                                                        onClick={() => setCurrentTab('Explorar')}
                                                        className="mt-8 bg-primary text-white px-10 py-4 rounded-2xl font-black text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95"
                                                    >
                                                        EXPLORAR AGORA
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-4 pb-12">
                                                    {orders.map((order) => (
                                                        <motion.div
                                                            key={order.id}
                                                            layout
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="bg-white rounded-[32px] p-5 border border-gray-100 shadow-sm space-y-4 relative overflow-hidden group"
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${order.status === 'completed' ? 'bg-green-50 border-green-100 text-green-500' : 'bg-primary/10 border-primary/20 text-primary'} `}>
                                                                    <ShoppingBag size={24} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="font-black text-gray-900 truncate uppercase text-sm tracking-tight">{order.bags?.title || 'Sacola Surpresa'}</h4>
                                                                    <p className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                                                                        <Store size={10} />
                                                                        {order.bags?.establishments?.name}
                                                                    </p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm font-black text-secondary italic">R$ {order.amount?.toFixed(2)}</p>
                                                                    <p className="text-[9px] font-black text-gray-300 uppercase">{new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between pt-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${order.status === 'completed' ? 'bg-green-100 text-green-600' :
                                                                        order.status === 'collected' ? 'bg-blue-100 text-blue-600' :
                                                                            'bg-orange-100 text-orange-600 animate-pulse'
                                                                        } `}>
                                                                        {order.status === 'completed' ? 'Retirado' :
                                                                            order.status === 'collected' ? 'Código Validado' :
                                                                                'Aguardando Retirada'}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => setSelectedOrderForChat(order)}
                                                                        className="p-2 bg-gray-50 text-gray-400 hover:text-secondary rounded-xl transition-colors"
                                                                    >
                                                                        <MessageSquare size={16} />
                                                                    </button>
                                                                </div>

                                                                {order.status === 'collected' && (
                                                                    <button
                                                                        onClick={() => setConfirmOrder(order)}
                                                                        className="bg-secondary text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-md shadow-secondary/10 hover:bg-secondary/90 transition-all active:scale-95 animate-bounce"
                                                                    >
                                                                        Recebi minha sacola
                                                                    </button>
                                                                )}
                                                                {order.status === 'pending' && (
                                                                    <div className="text-[9px] font-black text-gray-300 uppercase italic">Apresente o código abaixo no balcão</div>
                                                                )}

                                                                {order.status === 'completed' && (!order.reviews || order.reviews.length === 0) && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setRatingOrder(order)
                                                                            setRatingValue(5)
                                                                            setRatingComment('')
                                                                        }}
                                                                        className="flex items-center gap-1.5 bg-yellow-400 text-yellow-900 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-md shadow-yellow-200 hover:bg-yellow-300 transition-all active:scale-95"
                                                                    >
                                                                        <Star size={12} fill="currentColor" />
                                                                        Avaliar Sacola
                                                                    </button>
                                                                )}
                                                                {order.status === 'completed' && order.reviews?.length > 0 && (
                                                                    <span className="text-[9px] font-black text-green-500 uppercase italic flex items-center gap-1">
                                                                        <CheckCircle2 size={12} /> Avaliado
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Voucher Code Overlay for pending orders */}
                                                            {order.status !== 'completed' && (
                                                                <div className="mt-4 p-4 bg-surface-soft rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center space-y-2">
                                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Seu Voucher de Retirada</p>
                                                                    <p className="text-xl font-black text-gray-800 tracking-widest italic select-all cursor-copy">#RS-{order.id.split('-')[0].toUpperCase()}</p>
                                                                    <div className="flex items-center gap-2 text-[10px] text-primary font-bold">
                                                                        <MapPin size={10} />
                                                                        <span>{order.bags?.establishments?.address || 'Ver endereço no mapa'}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </AnimatePresence>
                            </main>

                            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-40">
                                <nav className="bg-white/90 backdrop-blur-xl border border-white/40 p-2 rounded-[24px] flex justify-around items-center shadow-2xl">
                                    <button onClick={() => setCurrentTab('Explorar')} className={`flex flex-col items-center gap-1 p-2 ${currentTab === 'Explorar' ? 'text-primary' : 'text-gray-400'} `}>
                                        <Store className="w-6 h-6" />
                                        <span className="text-[10px] font-black uppercase">Explorar</span>
                                    </button>
                                    <button onClick={() => setCurrentTab('Sacolas')} className={`flex flex-col items-center gap-1 p-2 ${currentTab === 'Sacolas' ? 'text-primary' : 'text-gray-400'} `}>
                                        <ShoppingBag className="w-6 h-6" />
                                        <span className="text-[10px] font-black uppercase">Sacolas</span>
                                    </button>
                                    <button onClick={() => setCurrentTab('Mapa')} className={`flex flex-col items-center gap-1 p-2 ${currentTab === 'Mapa' ? 'text-primary' : 'text-gray-400'} `}>
                                        <MapPin className="w-6 h-6" />
                                        <span className="text-[10px] font-black uppercase">Mapa</span>
                                    </button>
                                </nav>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {selectedStore && (
                        <StoreDetails
                            store={selectedStore}
                            userData={userData}
                            onBack={() => setSelectedStore(null)}
                            onAddItem={(items) => handlePlaceOrder(items)}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showLocationModal && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6">
                            <div className="bg-white w-full max-w-sm rounded-[40px] p-8 text-center space-y-6">
                                <Navigation className="w-12 h-12 text-primary mx-auto animate-pulse" />
                                <h2 className="text-2xl font-black italic">Onde você está?</h2>
                                <p className="text-gray-500 text-sm">Precisamos da sua localização para encontrar ofertas próximas.</p>
                                <button onClick={confirmLocationPermission} className="w-full bg-primary text-white p-4 rounded-2xl font-black">PERMITIR ACESSO</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {orderSuccess && (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 z-[200] flex items-center justify-center p-6 pointer-events-none">
                        <div className="bg-white p-8 rounded-[40px] shadow-2xl flex flex-col items-center text-center space-y-4 border-2 border-primary/20">
                            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-2xl font-black italic uppercase">Sacola Reservada!</h2>
                            <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Agora é só buscar e saborear!</p>
                        </div>
                    </motion.div>
                )}
                <AnimatePresence>
                    {showProfile && (
                        <UserProfile
                            userData={{
                                ...userData,
                                email: session?.user?.email // Injeta o e-mail da sessão aqui
                            }}
                            stats={{
                                ordersCount: orders.length,
                                totalSaved: orders.reduce((acc, curr) => acc + (curr.amount || 0), 0),
                                weightSaved: orders.filter(o => o.status === 'completed').reduce((acc, curr) => acc + (curr.bags?.weight_per_unit || 0), 0),
                                completedOrders: orders.filter(o => o.status === 'completed').length
                            }}
                            favorites={favorites}
                            establishments={establishments}
                            onBack={() => setShowProfile(false)}
                            onLogout={handleLogout}
                            onUpdate={(updatedData) => setUserData(updatedData)}
                        />
                    )}

                    {checkoutItems && (
                        <CheckoutModal
                            items={checkoutItems}
                            store={selectedStore}
                            onConfirm={handleConfirmCheckout}
                            onClose={() => setCheckoutItems(null)}
                        />
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {ratingOrder && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-6 backdrop-blur-sm"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                className="bg-white w-full max-w-md rounded-[40px] p-8 space-y-8 shadow-2xl overflow-hidden relative"
                            >
                                <div className="text-center space-y-2">
                                    <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-xl">
                                        <Star className="text-yellow-500 w-10 h-10" fill="currentColor" />
                                    </div>
                                    <h2 className="text-2xl font-black italic uppercase leading-none text-gray-900">Avaliar Sacola</h2>
                                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{ratingOrder.bags?.title}</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex justify-center gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                onClick={() => setRatingValue(star)}
                                                className="transition-transform active:scale-90"
                                            >
                                                <Star
                                                    size={32}
                                                    className={star <= ratingValue ? 'text-yellow-400' : 'text-gray-200'}
                                                    fill={star <= ratingValue ? 'currentColor' : 'none'}
                                                />
                                            </button>
                                        ))}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Comentário (opcional)</label>
                                        <textarea
                                            value={ratingComment}
                                            onChange={(e) => setRatingComment(e.target.value)}
                                            placeholder="Conte como foi sua experiência..."
                                            className="w-full bg-surface-soft border-2 border-transparent focus:border-primary/20 rounded-3xl p-4 text-sm font-bold text-gray-700 outline-none transition-all min-h-[100px] resize-none"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => setRatingOrder(null)}
                                            className="flex-1 bg-gray-100 text-gray-500 p-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            disabled={isSubmittingReview}
                                            onClick={async () => {
                                                setIsSubmittingReview(true)
                                                try {
                                                    const { error } = await supabase
                                                        .from('reviews')
                                                        .insert([{
                                                            user_id: session.user.id,
                                                            establishment_id: ratingOrder.bags.establishment_id,
                                                            order_id: ratingOrder.id,
                                                            rating: ratingValue,
                                                            comment: ratingComment
                                                        }])

                                                    if (error) throw error

                                                    setRatingOrder(null)
                                                    setReviewSuccess(true)
                                                    fetchOrders(session.user.id)
                                                    setTimeout(() => setReviewSuccess(false), 3000)
                                                } catch (err) {
                                                    alert('Erro ao salvar avaliação: ' + err.message)
                                                } finally {
                                                    setIsSubmittingReview(false)
                                                }
                                            }}
                                            className="flex-[2] bg-primary text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            {isSubmittingReview ? 'Enviando...' : 'Enviar Avaliação'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {confirmOrder && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300] flex items-center justify-center p-6"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden p-8 flex flex-col items-center text-center space-y-6"
                            >
                                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center">
                                    <ShoppingBag size={24} className="text-secondary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black italic uppercase leading-tight text-gray-900">Confirmar Entrega?</h2>
                                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-2 px-4 leading-relaxed">
                                        Ao confirmar, o pedido será finalizado e você poderá avaliar sua sacola.
                                    </p>
                                </div>
                                <div className="w-full space-y-3">
                                    <button
                                        onClick={handleConfirmCollection}
                                        className="w-full bg-secondary text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all"
                                    >
                                        SIM, RECEBI A SACOLA
                                    </button>
                                    <button
                                        onClick={() => setConfirmOrder(null)}
                                        className="w-full bg-gray-50 text-gray-400 p-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all"
                                    >
                                        Ainda não
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {reviewSuccess && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="fixed inset-0 z-[400] flex items-center justify-center p-6 pointer-events-none"
                        >
                            <div className="bg-white p-8 rounded-[40px] shadow-2xl flex flex-col items-center text-center space-y-4 border-2 border-yellow-400/20">
                                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200 animate-bounce">
                                    <CheckCircle2 className="w-10 h-10 text-white" size={40} />
                                </div>
                                <h2 className="text-2xl font-black italic uppercase text-gray-900 leading-none">Sucesso!</h2>
                                <p className="text-gray-500 font-bold uppercase text-xs tracking-widest px-4">Operação realizada com sucesso no Recife Save!</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Chat Modal */}
                {selectedOrderForChat && (
                    <OrderChat
                        orderId={selectedOrderForChat.id}
                        userId={userData.id}
                        onClose={() => setSelectedOrderForChat(null)}
                    />
                )}
            </div>
        </div >
    )
}

function OrderChat({ orderId, userId, onClose }) {
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        fetchMessages()

        // Real-time subscription
        const channel = supabase
            .channel(`order-chat-${orderId} `)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `order_id = eq.${orderId} `
            }, (payload) => {
                setMessages(prev => [...prev, payload.new])
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [orderId])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const fetchMessages = async () => {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('order_id', orderId)
            .order('created_at', { ascending: true })
        setMessages(data || [])
        setLoading(false)
    }

    const sendMessage = async (e) => {
        e.preventDefault()
        if (!newMessage.trim()) return

        const messageData = {
            order_id: orderId,
            sender_id: userId,
            content: newMessage,
        }

        const { error } = await supabase
            .from('messages')
            .insert([messageData])

        if (!error) {
            setNewMessage('')
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white w-full max-w-md h-[600px] rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
            >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white text-gray-900">
                    <div>
                        <h3 className="text-sm font-black uppercase italic">Chat da Reserva</h3>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">#{orderId.slice(0, 4)}</p>
                    </div>
                    <button onClick={onClose} className="bg-surface-soft p-2 rounded-xl text-gray-400">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="animate-spin text-gray-300" />
                        </div>
                    ) : (
                        messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-4 rounded-2xl font-bold text-xs ${msg.sender_id === userId ? 'bg-secondary text-white rounded-br-none shadow-md shadow-secondary/20' : 'bg-white text-gray-700 rounded-bl-none border border-gray-100'}`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={sendMessage} className="p-6 bg-white border-t border-gray-100 flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escreva sua mensagem..."
                        className="flex-1 bg-surface-soft border border-gray-100 p-4 rounded-2xl font-bold text-xs outline-none focus:ring-2 ring-secondary/20 transition-all"
                    />
                    <button
                        type="submit"
                        className="bg-secondary text-white p-4 rounded-2xl shadow-lg shadow-secondary/20 active:scale-90 transition-all"
                    >
                        <ArrowRight size={20} />
                    </button>
                </form>
            </motion.div>
        </div>
    )
}

export default App

