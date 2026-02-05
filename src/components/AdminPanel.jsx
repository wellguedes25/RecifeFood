import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard,
    Package,
    CheckCircle2,
    Search,
    Loader2,
    TrendingUp,
    AlertCircle,
    User,
    ArrowRight,
    Store,
    Calendar,
    ChevronRight,
    QrCode,
    Plus,
    Trash2,
    Edit2, // Added
    Settings,
    MessageSquare,
    Clock,
    Phone,
    MapPin,
    Star,
    X,
    ExternalLink,
    Save,
    ShoppingBag,
    RefreshCw,
    LogOut,
    BarChart3,
    PieChart,
    Power,
    Zap,
    Scale,
    Printer
} from 'lucide-react'
import { supabase } from '../lib/supabase'

function AdminPanel({ userData, onLogout }) {
    const [activeTab, setActiveTab] = useState('dashboard') // dashboard, orders, inventory, store, reviews
    const [orders, setOrders] = useState([])
    const [bags, setBags] = useState([])
    const [establishment, setEstablishment] = useState(null)
    const [selectedOrderForChat, setSelectedOrderForChat] = useState(null)
    const [reviews, setReviews] = useState([])
    const [loading, setLoading] = useState(true)
    const [voucherInput, setVoucherInput] = useState('')
    const [actionLoading, setActionLoading] = useState(false)
    const [isAddingBag, setIsAddingBag] = useState(false)
    const [isEditingBag, setIsEditingBag] = useState(null) // ID of the bag being edited
    const [stats, setStats] = useState({
        pending: 0,
        completed: 0,
        revenue: 0,
        rating: 0,
        kgSaved: 0,
        savingsGenerated: 0,
        boostsUsed: 0
    })

    // Premium Notifications
    const [notification, setNotification] = useState(null) // {type: 'success' | 'error', message: '', subMessage: '' }

    const showNotify = (type, message, subMessage = '') => {
        setNotification({ type, message, subMessage })
        setTimeout(() => setNotification(null), 3000)
    }

    // Form states for adding/editing bags
    const [bagForm, setBagForm] = useState({
        title: '',
        original_price: '',
        discounted_price: '',
        quantity: 1,
        type: 'Mista',
        pickup_window: '18:00-20:00',
        description: '',
        dietary_filters: []
    })

    // Store settings form
    const [storeForm, setStoreForm] = useState({
        name: '',
        category: '',
        address: '',
        phone: '',
        description: '',
        operating_hours: {}
    })

    const [storeTypes, setStoreTypes] = useState(['Mista', 'Padaria', 'Refeição', 'Veggie', 'Lanches', 'Hortifruti'])

    const fetchAdminData = useCallback(async () => {
        try {
            if (!userData?.establishment_id) return

            // 1. Fetch Establishment Details
            const { data: storeData } = await supabase
                .from('establishments')
                .select('*')
                .eq('id', userData.establishment_id)
                .single()

            if (storeData) {
                setEstablishment(storeData)
                setStoreForm({
                    name: storeData.name,
                    category: storeData.category,
                    address: storeData.address || '',
                    phone: storeData.phone || '',
                    description: storeData.description || '',
                    operating_hours: storeData.operating_hours || {
                        monday: { open: '08:00', close: '20:00', closed: false },
                        tuesday: { open: '08:00', close: '20:00', closed: false },
                        wednesday: { open: '08:00', close: '20:00', closed: false },
                        thursday: { open: '08:00', close: '20:00', closed: false },
                        friday: { open: '08:00', close: '20:00', closed: false },
                        saturday: { open: '08:00', close: '18:00', closed: false },
                        sunday: { open: '08:00', close: '12:00', closed: true }
                    }
                })
            }

            // 2. Fetch Orders
            const { data: ordersData } = await supabase
                .from('orders')
                .select(`
                    *,
                    bags!inner (*)
                `)
                .eq('bags.establishment_id', userData.establishment_id)
                .order('created_at', { ascending: false })

            const fetchedOrders = ordersData || []
            setOrders(fetchedOrders)

            // 3. Fetch Reviews-With Profile Join for names
            const { data: reviewsData } = await supabase
                .from('reviews')
                .select(`
                    *,
                    profiles:user_id (full_name)
                `)
                .eq('establishment_id', userData.establishment_id)
                .order('created_at', { ascending: false })

            const fetchedReviews = reviewsData || []
            setReviews(fetchedReviews)

            // 4. Fetch Bags
            const { data: bagsData } = await supabase
                .from('bags')
                .select('*')
                .eq('establishment_id', userData.establishment_id)
                .order('created_at', { ascending: false })
            setBags(bagsData || [])

            // 5. Stats calculation using local variables (not state)
            const activeOrdersCount = fetchedOrders.filter(o => o.status === 'pending' || o.status === 'collected').length
            const completedOrders = fetchedOrders.filter(o => o.status === 'completed')
            const totalRevenue = completedOrders.reduce((acc, curr) => acc + (curr.amount || 0), 0)

            // Impact metrics
            const totalKgSaved = completedOrders.reduce((acc, curr) => acc + (curr.bags?.weight_per_unit || 0.5), 0)
            const totalSavings = completedOrders.reduce((acc, curr) => {
                const bag = curr.bags || {}
                const diff = (bag.original_price || 0) - (bag.discounted_price || 0)
                return acc + (diff > 0 ? diff : 0)
            }, 0)

            const avgRating = fetchedReviews.length > 0
                ? (fetchedReviews.reduce((acc, r) => acc + r.rating, 0) / fetchedReviews.length).toFixed(1)
                : 0

            setStats({
                pending: activeOrdersCount,
                completed: completedOrders.length,
                revenue: totalRevenue,
                rating: avgRating || 0,
                kgSaved: totalKgSaved,
                savingsGenerated: totalSavings,
                boostsUsed: (await supabase.from('boost_usages').select('id', { count: 'exact' }).eq('establishment_id', userData.establishment_id)).count || 0
            })

        } catch (error) {
            console.error('Error fetching admin data:', error)
        } finally {
            setLoading(false)
        }
    }, [userData?.establishment_id])

    useEffect(() => {
        fetchAdminData()

        const channel = supabase
            .channel('admin-updates-main')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchAdminData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => fetchAdminData())
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [fetchAdminData])

    const handleConfirmVoucher = async () => {
        if (!voucherInput.trim()) return

        setActionLoading(true)
        try {
            // Find order by voucher code (partial UUID match)
            const inputCode = voucherInput.replace('#RS-', '').trim().toLowerCase()

            // Fetch all pending orders for this establishment to filter in JS
            // This is safer than partial string matching on UUID columns
            const { data: allPending, error: fetchError } = await supabase
                .from('orders')
                .select('*, bags!inner (*)')
                .eq('bags.establishment_id', userData.establishment_id)
                .eq('status', 'pending')

            if (fetchError) throw fetchError

            const matchingOrder = (allPending || []).find(o =>
                o.id.toLowerCase().startsWith(inputCode)
            )

            if (!matchingOrder) throw new Error('Código inválido ou sacola já coletada.')

            // Update status to collected (merchant verified)
            const { error: updateError } = await supabase
                .from('orders')
                .update({
                    status: 'collected',
                    merchant_confirmed: true
                })
                .eq('id', matchingOrder.id)

            if (updateError) throw updateError

            showNotify('success', 'VOUCHER VALIDADO!', matchingOrder.bags?.title || 'Reserva confirmada')
            setVoucherInput('')
            fetchAdminData()

        } catch (error) {
            showNotify('error', 'CÓDIGO INVÁLIDO', error.message)
        } finally {
            setActionLoading(false)
        }
    }

    const printOrder = (order) => {
        const printWindow = window.open('', '_blank', 'width=400,height=600')
        printWindow.document.write(`
            <html>
                <head>
                    <title>Ticket #RS-${order.id.slice(0, 4).toUpperCase()}</title>
                    <style>
                        body {font-family: 'Courier New', Courier, monospace; padding: 20px; }
                        .ticket {border: 1px dashed #000; padding: 15px; text-align: center; }
                        h1 {font-size: 18px; margin-bottom: 5px; }
                        .detail {margin: 10px 0; font-size: 14px; text-transform: uppercase; }
                        .id {font-weight: bold; font-size: 20px; margin: 15px 0; }
                    </style>
                </head>
                <body>
                    <div class="ticket">
                        <h1>${establishment.name}</h1>
                        <p>Recife Save-Reserva</p>
                        <div class="id">#RS-${order.id.slice(0, 4).toUpperCase()}</div>
                        <div class="detail">Sacola: ${order.bags?.title}</div>
                        <div class="detail">Cliente: ${order.profiles?.full_name || 'Cliente'}</div>
                        <div class="detail">Data: ${new Date().toLocaleDateString('pt-BR')}</div>
                        <hr/>
                        <p style="font-size: 10px">Obrigado por ajudar a<br/>combater o desperdício!</p>
                    </div>
                </body>
            </html>
        `)
        printWindow.document.close()
        printWindow.print()
    }

    const notifyFollowers = async (bagTitle) => {
        try {
            // 1. Get all users following this store
            const { data: followers, error: fetchError } = await supabase
                .from('profiles')
                .select('id')
                .contains('following', [userData.establishment_id])

            if (fetchError || !followers) return

            // 2. Create notifications for each follower
            const notifications = followers.map(f => ({
                user_id: f.id,
                title: `Nova Sacola em ${establishment.name}!`,
                content: `${bagTitle} acaba de ser adicionada. Corra para salvar!`,
                type: 'alert'
            }))

            if (notifications.length > 0) {
                await supabase.from('notifications').insert(notifications)
            }
        } catch (err) {
            console.error('Error notifying followers:', err)
        }
    }

    const handleSaveBag = async () => {
        setActionLoading(true)
        try {
            const dataToSave = {
                establishment_id: userData.establishment_id,
                title: bagForm.title,
                original_price: parseFloat(bagForm.original_price),
                discounted_price: parseFloat(bagForm.discounted_price),
                quantity: parseInt(bagForm.quantity),
                type: bagForm.type,
                pickup_window: bagForm.pickup_window,
                description: bagForm.description,
                dietary_filters: bagForm.dietary_filters || [],
                establishment_id: userData.establishment_id
            }

            let error
            if (isEditingBag) {
                const { error: updateError } = await supabase
                    .from('bags')
                    .update(dataToSave)
                    .eq('id', isEditingBag)
                error = updateError
            } else {
                const { error: insertError } = await supabase
                    .from('bags')
                    .insert([dataToSave]) // Changed bagData to dataToSave
                error = insertError
            }
            if (error) throw error

            if (!isEditingBag) {
                notifyFollowers(bagForm.title)
            }

            showNotify('success', isEditingBag ? 'SACOLA ATUALIZADA' : 'SACOLA CRIADA', 'Suas alterações foram salvas com sucesso.')
            setIsAddingBag(false)
            setIsEditingBag(null)
            fetchAdminData()
        } catch (error) {
            showNotify('error', 'ERRO AO SALVAR', error.message)
        } finally {
            setActionLoading(false)
        }
    }

    const deleteBag = async (id) => {
        if (!confirm('Deseja realmente excluir esta sacola?')) return
        try {
            await supabase.from('bags').delete().eq('id', id)
            showNotify('success', 'SACOLA REMOVIDA', 'Item excluído do seu catálogo.')
            fetchAdminData()
        } catch (error) {
            showNotify('error', 'ERRO AO DELETAR', error.message)
        }
    }

    const handleUpdateStore = async () => {
        setActionLoading(true)
        try {
            const { error } = await supabase
                .from('establishments')
                .update({
                    name: storeForm.name,
                    category: storeForm.category,
                    address: storeForm.address,
                    phone: storeForm.phone,
                    description: storeForm.description,
                    operating_hours: storeForm.operating_hours
                })
                .eq('id', userData.establishment_id)

            if (error) throw error
            showNotify('success', 'PERFIL ATUALIZADO', 'Suas informações foram salvas!')
            fetchAdminData()
        } catch (error) {
            showNotify('error', 'ERRO AO ATUALIZAR', error.message)
        } finally {
            setActionLoading(false)
        }
    }

    const toggleStoreStatus = async () => {
        const newStatus = !establishment.is_open
        try {
            const { error } = await supabase
                .from('establishments')
                .update({ is_open: newStatus })
                .eq('id', userData.establishment_id)

            if (error) throw error
            setEstablishment({ ...establishment, is_open: newStatus })
            showNotify('success', newStatus ? 'LOJA ABERTA' : 'LOJA FECHADA', newStatus ? 'Clientes podem ver suas sacolas.' : 'Sua loja está oculta na busca.')
        } catch (error) {
            showNotify('error', 'ERRO AO ALTERAR STATUS', error.message)
        }
    }

    const toggleBagStatus = async (bagId, currentStatus) => {
        try {
            const { error } = await supabase
                .from('bags')
                .update({ is_active: !currentStatus })
                .eq('id', bagId)

            if (error) throw error
            fetchAdminData()
            showNotify('success', !currentStatus ? 'PRODUTO ATIVO' : 'PRODUTO ESGOTADO', !currentStatus ? 'Disponível para os clientes.' : 'Marcado como indisponível.')
        } catch (error) {
            showNotify('error', 'ERRO AO ALTERAR STATUS', error.message)
        }
    }

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
                <Loader2 size={40} className="text-primary animate-spin" />
                <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Carregando Painel...</p>
            </div>
        )
    }

    const NavItem = ({ id, icon: Icon, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex flex-col items-center gap-1.5 transition-all relative ${activeTab === id ? 'text-primary scale-110' : 'text-gray-300 hover:text-gray-400'}`}
        >
            <div className={`p-3 rounded-2xl transition-all ${activeTab === id ? 'bg-primary/10 shadow-lg shadow-primary/5' : ''}`}>
                <Icon size={20} />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-wider ${activeTab === id ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
            {activeTab === id && (
                <motion.div layoutId="nav-dot" className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full" />
            )}
        </button>
    )

    return (
        <div className="flex-1 flex flex-col min-h-screen bg-surface-soft pb-32">
            <header className="bg-white p-6 sticky top-0 z-40 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/5 p-3 rounded-[20px]">
                            <Store className="text-primary w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-black italic uppercase tracking-tight text-gray-900">{establishment?.name}</h1>
                                {establishment?.is_promoted && (
                                    <div className="bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-md text-[8px] font-black uppercase flex items-center gap-1 shadow-sm shadow-yellow-200">
                                        <Zap size={8} fill="currentColor" /> Destaque Ativo
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${establishment?.is_open ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    {establishment?.is_open ? 'Loja Aberta' : 'Loja Fechada'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleStoreStatus}
                            className={`p-3 rounded-2xl transition-all flex items-center gap-2 ${establishment?.is_open ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}
                        >
                            <Power size={18} className={establishment?.is_open ? 'text-green-600' : 'text-red-600'} />
                            <span className="text-[10px] font-black uppercase hidden sm:block">
                                {establishment?.is_open ? 'NO AR' : 'OFFLINE'}
                            </span>
                        </button>
                        <button onClick={fetchAdminData} className="bg-surface-soft p-3 rounded-2xl text-gray-400 hover:text-primary transition-all active:rotate-180">
                            <RefreshCw size={20} />
                        </button>
                        <button onClick={onLogout} className="bg-surface-soft p-3 rounded-2xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-6 space-y-8 overflow-y-auto">
                {/* 1. DASHBOARD TAB */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#DDA63A] p-6 rounded-[40px] text-white shadow-xl shadow-[#DDA63A]/20 relative overflow-hidden group">
                                <TrendingUp className="absolute right-[-10px] top-[-10px] w-24 h-24 opacity-10 group-hover:scale-110 transition-transform" />
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Ganhos Totais</p>
                                <h2 className="text-2xl font-black mt-1 italic">R$ {stats.revenue.toFixed(2)}</h2>
                            </div>
                            <div className="bg-[#EF7E22] p-6 rounded-[40px] text-white shadow-xl shadow-[#EF7E22]/20 relative overflow-hidden group">
                                <Star className="absolute right-[-10px] top-[-10px] w-24 h-24 opacity-10 group-hover:scale-110 transition-transform" />
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Sua Nota</p>
                                <h2 className="text-2xl font-black mt-1 italic">{stats.rating > 0 ? stats.rating : '---'}</h2>
                            </div>
                        </div>

                        {/* Quick Action: Validate Voucher */}
                        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="bg-secondary/10 p-2 rounded-xl">
                                    <QrCode className="text-secondary w-5 h-5" />
                                </div>
                                <h3 className="text-sm font-black uppercase italic text-gray-800">Validar Código Cliente</h3>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Ex: #RS-7A6A"
                                    value={voucherInput}
                                    onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                                    className="w-full bg-surface-soft border-2 border-transparent p-5 rounded-[24px] font-black text-lg tracking-widest focus:border-secondary/20 focus:bg-white outline-none transition-all"
                                />
                                <button
                                    onClick={handleConfirmVoucher}
                                    disabled={actionLoading || !voucherInput}
                                    className="absolute right-2 top-2 bottom-2 bg-secondary text-white px-6 rounded-[18px] font-black text-xs uppercase shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {actionLoading ? <Loader2 className="animate-spin" size={16} /> : 'CONFIRMAR'}
                                </button>
                            </div>
                        </div>

                        {/* Order Queue Mini */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-sm font-black uppercase italic">Para preparar agora</h3>
                                <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase">{stats.pending} pendentes</span>
                            </div>
                            <div className="space-y-3">
                                {orders.slice(0, 3).map(order => (
                                    <div key={order.id} className="bg-white p-4 rounded-[28px] border border-gray-100 flex items-center gap-4 group hover:border-primary/20 transition-all">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${order.status === 'pending' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}`}>
                                            <ShoppingBag size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-black text-xs uppercase">{order.bags?.title}</h4>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Reserva #{order.id.slice(0, 4).toUpperCase()}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSelectedOrderForChat(order)
                                                }}
                                                className="p-2 bg-gray-50 text-gray-400 hover:text-secondary rounded-xl transition-colors"
                                            >
                                                <MessageSquare size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    printOrder(order)
                                                }}
                                                className="p-2 bg-gray-50 text-gray-400 hover:text-primary rounded-xl transition-colors"
                                            >
                                                <Printer size={16} />
                                            </button>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-300 group-hover:text-primary transition-colors" />
                                    </div>
                                ))}
                                {orders.length === 0 && (
                                    <div className="text-center py-10 bg-white/50 rounded-[32px] border-2 border-dashed border-gray-200">
                                        <p className="text-[10px] font-black text-gray-400 uppercase">Nenhum pedido hoje ainda</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. ORDERS TAB */}
                {activeTab === 'orders' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="px-2">
                            <h3 className="text-xl font-black italic uppercase">Histórico de Pedidos</h3>
                            <p className="text-gray-400 font-bold text-xs uppercase mt-1">Controle suas vendas</p>
                        </div>
                        <div className="space-y-4">
                            {orders.map(order => (
                                <div key={order.id} className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${order.status === 'completed' ? 'bg-green-50 text-green-500' : 'bg-primary/10 text-primary'}`}>
                                                <Package size={24} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase">#RS-{order.id.split('-')[0].toUpperCase()}</p>
                                                <h4 className="font-black text-[13px] uppercase tracking-tight">{order.bags?.title}</h4>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${order.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                            {order.status === 'completed' ? 'Finalizado' : 'Pendente'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-4">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-surface-soft w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-gray-400">
                                                ID
                                            </div>
                                            <p className="text-[10px] font-black text-gray-500 uppercase">USUÁRIO #{order.user_id.slice(0, 4)}</p>
                                        </div>
                                        <p className="text-sm font-black text-primary italic">R$ {order.amount?.toFixed(2)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. INVENTORY TAB */}
                {activeTab === 'inventory' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-between items-end px-2">
                            <div>
                                <h3 className="text-xl font-black italic uppercase">Suas Sacolas</h3>
                                <p className="text-gray-400 font-bold text-xs uppercase mt-1">Gerencie o que vai salvar hoje</p>
                            </div>
                            <button
                                onClick={() => {
                                    setBagForm({
                                        title: '',
                                        original_price: '',
                                        discounted_price: '',
                                        quantity: 1,
                                        type: 'Mista',
                                        pickup_window: '18:00-20:00',
                                        description: '',
                                        dietary_filters: []
                                    })
                                    setIsEditingBag(null)
                                    setIsAddingBag(true)
                                }}
                                className="bg-primary text-white p-3 rounded-2xl shadow-lg shadow-primary/20 active:scale-90 transition-all"
                            >
                                <Plus size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {bags.map(bag => (
                                <div key={bag.id} className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm space-y-4 relative group">
                                    <div className="flex justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-surface-soft w-14 h-14 rounded-2xl flex items-center justify-center">
                                                <Store size={24} className="text-primary" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-sm uppercase text-gray-800">{bag.title}</h4>
                                                <p className="text-[9px] font-black text-secondary tracking-widest uppercase">{bag.type}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setBagForm(bag)
                                                    setIsEditingBag(bag.id)
                                                    setIsAddingBag(true)
                                                }}
                                                className="p-2 text-gray-300 hover:text-primary transition-colors"
                                            >
                                                <Settings size={18} />
                                            </button>
                                            <button onClick={() => deleteBag(bag.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-5 gap-4 pt-2">
                                        <div className="bg-surface-soft p-3 rounded-2xl text-center">
                                            <p className="text-[8px] font-black text-gray-400 uppercase mb-1">QTD</p>
                                            <p className="text-sm font-black text-gray-800">{bag.quantity} un</p>
                                        </div>
                                        <div className="bg-surface-soft p-3 rounded-2xl text-center">
                                            <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Preço</p>
                                            <p className="text-sm font-black text-primary">R$ {bag.discounted_price.toFixed(2)}</p>
                                        </div>
                                        <div className="bg-surface-soft p-3 rounded-2xl text-center">
                                            <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Janela</p>
                                            <p className="text-[10px] font-black text-gray-800">{bag.pickup_window}</p>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                const currentFee = establishment?.boost_fee || 2.00
                                                const isActivating = !bag.is_urgent

                                                if (isActivating && !confirm(`Deseja ativar o IMPULSO? Uma taxa de R$ ${currentFee} será contabilizada para esta sacola.`)) {
                                                    return
                                                }

                                                try {
                                                    const { error } = await supabase.from('bags').update({ is_urgent: isActivating }).eq('id', bag.id)
                                                    if (error) throw error

                                                    if (isActivating) {
                                                        // Log boost usage for billing
                                                        await supabase.from('boost_usages').insert([{
                                                            establishment_id: userData.establishment_id,
                                                            bag_id: bag.id,
                                                            fee_at_time: currentFee
                                                        }])
                                                    }

                                                    showNotify('success', isActivating ? 'IMPULSO ATIVADO' : 'IMPULSO DESATIVADO', isActivating ? `Taxa de R$ ${currentFee} aplicada.` : 'Sua sacola voltou ao modo padrão.')
                                                    fetchAdminData()
                                                } catch (e) { showNotify('error', 'ERRO', e.message) }
                                            }}
                                            className={`rounded-2xl flex flex-col items-center justify-center transition-all ${bag.is_urgent ? 'bg-urgence text-white shadow-lg shadow-urgence/30 animate-pulse' : 'bg-surface-soft text-gray-300 hover:text-urgence'}`}
                                            title="Venda Rápida (Urgente)"
                                        >
                                            <Zap size={16} fill={bag.is_urgent ? "currentColor" : "none"} />
                                            <span className="text-[7px] font-black uppercase mt-1">{bag.is_urgent ? 'IMPULSO' : 'PUSH'}</span>
                                        </button>
                                        <button
                                            onClick={() => toggleBagStatus(bag.id, bag.is_active)}
                                            className={`rounded-2xl flex flex-col items-center justify-center transition-all ${bag.is_active ? 'bg-surface-soft text-gray-400 hover:text-orange-500' : 'bg-orange-50 text-orange-500 border border-orange-100'}`}
                                        >
                                            <Zap size={16} fill={!bag.is_active ? "currentColor" : "none"} />
                                            <span className="text-[7px] font-black uppercase mt-1">{bag.is_active ? 'ATIVO' : 'OFF'}</span>
                                        </button>
                                    </div>
                                    {!bag.is_active && (
                                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] rounded-[32px] flex items-center justify-center z-10">
                                            <div className="bg-orange-500 text-white px-6 py-2 rounded-full font-black uppercase text-[10px] shadow-lg shadow-orange-200">
                                                Produto Esgotado
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. ANALYTICS TAB */}
                {activeTab === 'analytics' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="px-2">
                            <h3 className="text-xl font-black italic uppercase">Seu Impacto Social</h3>
                            <p className="text-gray-400 font-bold text-xs uppercase mt-1">Veja quanto desperdício você evitou</p>
                        </div>

                        <div className="grid gap-6">
                            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col items-center text-center space-y-4">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                                    <Scale size={40} className="text-green-500" />
                                </div>
                                <div>
                                    <h4 className="text-3xl font-black text-gray-900">{stats.kgSaved.toFixed(1)} KG</h4>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Alimentos Salvos</p>
                                </div>
                                <div className="w-full h-2 bg-surface-soft rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '70%' }}
                                        className="h-full bg-green-500"
                                    />
                                </div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase">Você já evitou o equivalente a {(stats.kgSaved * 2).toFixed(0)} refeições completas.</p>
                            </div>

                            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col items-center text-center space-y-4">
                                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                                    <TrendingUp size={40} className="text-blue-500" />
                                </div>
                                <div>
                                    <h4 className="text-3xl font-black text-gray-900">R$ {stats.savingsGenerated.toFixed(2)}</h4>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Economia para os Clientes</p>
                                </div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase">Dinheiro que voltou para a mesa da comunidade através da sua loja.</p>
                            </div>

                            <div className="bg-secondary p-8 rounded-[40px] shadow-sm text-white flex flex-col items-center text-center space-y-4 relative overflow-hidden">
                                <Zap className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
                                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                                    <Zap size={40} className="text-white" fill="white" />
                                </div>
                                <div>
                                    <h4 className="text-3xl font-black italic uppercase">{stats.boostsUsed} Impulsos</h4>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">Utilizados até agora</p>
                                </div>
                                <div className="pt-4 border-t border-white/10 w-full">
                                    <p className="text-[9px] font-bold uppercase opacity-60 tracking-wider">Custo de Impulso Acumulado:</p>
                                    <p className="text-xl font-black italic">R$ {(stats.boostsUsed * (establishment?.boost_fee || 2.0)).toFixed(2)}</p>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-xs font-black uppercase italic">Performance Diária</h4>
                                    <PieChart size={16} className="text-gray-300" />
                                </div>
                                <div className="flex items-end justify-between h-32 gap-2 px-2">
                                    {[60, 40, 80, 50, 90, 70, 100].map((h, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: `${h}%` }}
                                                className={`w-full rounded-t-xl ${h > 80 ? 'bg-primary' : 'bg-primary/30'}`}
                                            />
                                            <span className="text-[7px] font-black text-gray-300">{['Q', 'Q', 'S', 'S', 'D', 'S', 'T'][i]}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. STORE TAB */}
                {activeTab === 'store' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="px-2">
                            <h3 className="text-xl font-black italic uppercase">Meu Perfil</h3>
                            <p className="text-gray-400 font-bold text-xs uppercase mt-1">Configure sua loja no App</p>
                        </div>

                        {/* Visibility & Ads Status */}
                        <div className="bg-gradient-to-br from-gray-900 to-black rounded-[40px] p-8 text-white shadow-xl relative overflow-hidden group">
                            <Zap className="absolute right-[-20px] top-[-20px] w-48 h-48 opacity-10 group-hover:scale-110 transition-all duration-700" />
                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-black uppercase italic tracking-widest text-primary">Crescimento & Visibilidade</h4>
                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${establishment?.is_promoted ? 'bg-yellow-400 text-yellow-900 shadow-lg shadow-yellow-200' : 'bg-white/10 text-white/50'}`}>
                                        {establishment?.is_promoted ? 'Destaque Ativo' : 'Status: Padrão'}
                                    </span>
                                </div>
                                {establishment?.is_promoted ? (
                                    <div className="space-y-2">
                                        <p className="text-sm font-bold text-white/90 leading-tight">Sua loja está sendo exibida no carrossel de <span className="text-yellow-400 font-black italic">Destaques da Semana</span>.</p>
                                        <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Expectativa de +40% em visitas ao perfil hoje.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-sm font-bold text-white/80">Aumente suas vendas aparecendo no topo para clientes em Recife.</p>
                                        <button className="bg-white text-black px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-primary hover:text-white transition-all active:scale-95">
                                            SAIBA COMO IMPULSIONAR
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1 ml-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome Fantasia</label>
                                    <div className="relative">
                                        <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                                        <input
                                            type="text"
                                            value={storeForm.name}
                                            onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                                            className="w-full bg-surface-soft border border-gray-100 p-4 pl-12 rounded-2xl font-black text-xs uppercase focus:ring-2 ring-primary/20 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1 ml-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Endereço Completo</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                                        <input
                                            type="text"
                                            value={storeForm.address}
                                            onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                                            className="w-full bg-surface-soft border border-gray-100 p-4 pl-12 rounded-2xl font-bold text-xs focus:ring-2 ring-primary/20 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1 ml-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</label>
                                        <input
                                            type="text"
                                            value={storeForm.category}
                                            onChange={(e) => setStoreForm({ ...storeForm, category: e.target.value })}
                                            className="w-full bg-surface-soft border border-gray-100 p-4 rounded-2xl font-black text-xs uppercase focus:ring-2 ring-primary/20 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1 ml-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">WhatsApp</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                                            <input
                                                type="text"
                                                value={storeForm.phone}
                                                onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                                                className="w-full bg-surface-soft border border-gray-100 p-4 pl-12 rounded-2xl font-bold text-xs focus:ring-2 ring-primary/20 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-gray-50">
                                    <h4 className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Horários de Funcionamento</h4>
                                    <div className="grid gap-3">
                                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                                            <div key={day} className="flex items-center justify-between bg-surface-soft p-3 rounded-2xl border border-gray-50">
                                                <span className="text-[10px] font-black uppercase text-gray-500 w-24">
                                                    {day === 'monday' ? 'Segunda' : day === 'tuesday' ? 'Terça' : day === 'wednesday' ? 'Quarta' : day === 'thursday' ? 'Quinta' : day === 'friday' ? 'Sexta' : day === 'saturday' ? 'Sábado' : 'Domingo'}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="time"
                                                        value={storeForm.operating_hours?.[day]?.open || '08:00'}
                                                        disabled={storeForm.operating_hours?.[day]?.closed}
                                                        onChange={(e) => {
                                                            const newHours = { ...storeForm.operating_hours }
                                                            newHours[day] = { ...newHours[day], open: e.target.value }
                                                            setStoreForm({ ...storeForm, operating_hours: newHours })
                                                        }}
                                                        className="bg-white border border-gray-100 p-2 rounded-xl text-[10px] font-black outline-none disabled:opacity-30"
                                                    />
                                                    <span className="text-[10px] font-black text-gray-300">ATÉ</span>
                                                    <input
                                                        type="time"
                                                        value={storeForm.operating_hours?.[day]?.close || '20:00'}
                                                        disabled={storeForm.operating_hours?.[day]?.closed}
                                                        onChange={(e) => {
                                                            const newHours = { ...storeForm.operating_hours }
                                                            newHours[day] = { ...newHours[day], close: e.target.value }
                                                            setStoreForm({ ...storeForm, operating_hours: newHours })
                                                        }}
                                                        className="bg-white border border-gray-100 p-2 rounded-xl text-[10px] font-black outline-none disabled:opacity-30"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newHours = { ...storeForm.operating_hours }
                                                            newHours[day] = { ...newHours[day], closed: !newHours[day]?.closed }
                                                            setStoreForm({ ...storeForm, operating_hours: newHours })
                                                        }}
                                                        className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${storeForm.operating_hours?.[day]?.closed ? 'bg-red-500 text-white' : 'bg-green-100 text-green-600'}`}
                                                    >
                                                        {storeForm.operating_hours?.[day]?.closed ? 'FECHADO' : 'ABERTO'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1 ml-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sobre o Estabelecimento</label>
                                    <textarea
                                        rows={3}
                                        value={storeForm.description}
                                        onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
                                        className="w-full bg-surface-soft border border-gray-100 p-4 rounded-2xl font-bold text-xs focus:ring-2 ring-primary/20 outline-none resize-none"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleUpdateStore}
                                disabled={actionLoading}
                                className="w-full bg-primary text-white py-5 rounded-[24px] font-black uppercase shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                                {actionLoading ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                                Salvar Configurações
                            </button>
                        </div>
                    </div>
                )}

                {/* 5. REVIEWS TAB */}
                {
                    activeTab === 'reviews' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="px-2">
                                <h3 className="text-xl font-black italic uppercase">Feedback dos Clientes</h3>
                                <p className="text-gray-400 font-bold text-xs uppercase mt-1">O que estão dizendo do seu impacto</p>
                            </div>

                            <div className="grid gap-4">
                                {reviews.length === 0 ? (
                                    <div className="bg-white/50 rounded-[40px] p-20 border-2 border-dashed border-gray-200 text-center flex flex-col items-center">
                                        <MessageSquare size={48} className="text-gray-200 mb-4" />
                                        <h4 className="font-black uppercase text-gray-300 italic">Aguardando novas avaliações...</h4>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">Suas avaliações aparecerão aqui conforme as entregas forem feitas.</p>
                                    </div>
                                ) : (
                                    reviews.map(review => (
                                        <div key={review.id} className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-surface-soft w-10 h-10 rounded-full flex items-center justify-center text-gray-400 font-black">
                                                        {(review.profiles?.full_name?.charAt(0) || 'C').toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-black uppercase text-[10px]">{review.profiles?.full_name || 'Cliente'}</p>
                                                        <div className="flex gap-0.5 mt-0.5">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star key={i} size={8} fill={i < review.rating ? "#DDA63A" : "transparent"} stroke={i < review.rating ? "#DDA63A" : "#E2E8F0"} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="text-[9px] font-bold text-gray-300">{new Date(review.created_at).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                            <p className="text-xs font-bold text-gray-500 italic leading-relaxed">"{review.comment || 'Sem comentário.'}"</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )
                }
            </main >

            {/* Modal for Adding Bag */}
            < AnimatePresence >
                {isAddingBag && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-2xl font-black italic uppercase">{isEditingBag ? 'Editar Sacola' : 'Nova Sacola'}</h3>
                                <button onClick={() => {
                                    setIsAddingBag(false)
                                    setIsEditingBag(null)
                                }} className="bg-surface-soft p-2 rounded-xl text-gray-400">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Título da Sacola</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: Sacola Pães do Dia"
                                            value={bagForm.title}
                                            onChange={(e) => setBagForm({ ...bagForm, title: e.target.value })}
                                            className="w-full bg-surface-soft border border-gray-100 p-4 rounded-2xl font-black uppercase text-xs focus:ring-2 ring-primary/20 outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Preço Original</label>
                                            <input
                                                type="number"
                                                placeholder="R$ 0,00"
                                                value={bagForm.original_price}
                                                onChange={(e) => setBagForm({ ...bagForm, original_price: parseFloat(e.target.value) })}
                                                className="w-full bg-surface-soft border border-gray-100 p-4 rounded-2xl font-black text-xs focus:ring-2 ring-primary/20 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Preço Recife Save</label>
                                            <input
                                                type="number"
                                                placeholder="R$ 0,00"
                                                value={bagForm.discounted_price}
                                                onChange={(e) => setBagForm({ ...bagForm, discounted_price: parseFloat(e.target.value) })}
                                                className="w-full bg-surface-soft border border-gray-100 p-4 rounded-2xl font-black text-xs focus:ring-2 ring-primary/20 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Quantidade Inicial</label>
                                            <input
                                                type="number"
                                                placeholder="10"
                                                value={bagForm.quantity}
                                                onChange={(e) => setBagForm({ ...bagForm, quantity: parseInt(e.target.value) })}
                                                className="w-full bg-surface-soft border border-gray-100 p-4 rounded-2xl font-black text-xs focus:ring-2 ring-primary/20 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Tipo de Sacola</label>
                                            <select
                                                value={bagForm.type}
                                                onChange={(e) => setBagForm({ ...bagForm, type: e.target.value })}
                                                className="w-full bg-surface-soft border border-gray-100 p-4 rounded-2xl font-black uppercase text-xs focus:ring-2 ring-primary/20 outline-none appearance-none cursor-pointer"
                                            >
                                                {storeTypes.map(type => (
                                                    <option key={type} value={type}>{type.toUpperCase()}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Horário Retirada</label>
                                        <input
                                            type="text"
                                            placeholder="18:00-19:30"
                                            value={bagForm.pickup_window}
                                            onChange={(e) => setBagForm({ ...bagForm, pickup_window: e.target.value })}
                                            className="w-full bg-surface-soft border border-gray-100 p-4 rounded-2xl font-black uppercase text-xs focus:ring-2 ring-primary/20 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Restrições Alimentares</label>
                                        <div className="flex flex-wrap gap-2 p-1">
                                            {['Vegano', 'Sem Glúten', 'Zero Lactose'].map(filter => (
                                                <button
                                                    key={filter}
                                                    onClick={() => {
                                                        const current = bagForm.dietary_filters || []
                                                        const next = current.includes(filter)
                                                            ? current.filter(f => f !== filter)
                                                            : [...current, filter]
                                                        setBagForm({ ...bagForm, dietary_filters: next })
                                                    }}
                                                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all border-2 ${bagForm.dietary_filters?.includes(filter) ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-surface-soft border-transparent text-gray-400'}`}
                                                >
                                                    {filter}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Conteúdo da Sacola (Opcional)</label>
                                        <textarea
                                            rows={3}
                                            placeholder="Ex: 3 Sonhos, 2 Croissants e 1 Pão de Forma"
                                            value={bagForm.description}
                                            onChange={(e) => setBagForm({ ...bagForm, description: e.target.value })}
                                            className="w-full bg-surface-soft border border-gray-100 p-4 rounded-2xl font-bold text-xs focus:ring-2 ring-primary/20 outline-none resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 border-t border-gray-100 bg-surface-soft/30">
                                <button
                                    onClick={handleSaveBag}
                                    disabled={actionLoading}
                                    className="w-full bg-primary text-white py-5 rounded-[24px] font-black uppercase shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {actionLoading ? <Loader2 size={20} className="animate-spin" /> : (isEditingBag ? 'Salvar Alterações' : 'Criar Sacola Agora')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence >

            {/* Navigation Bar */}
            < div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 z-50" >
                <nav className="bg-white/90 backdrop-blur-xl border border-white/40 p-5 px-8 rounded-[40px] flex justify-between items-center shadow-[0_20px_50px_rgba(0,0,0,0.15)] ring-1 ring-black/5">
                    <NavItem id="dashboard" icon={LayoutDashboard} label="Home" />
                    <NavItem id="orders" icon={Calendar} label="Pedidos" />
                    <NavItem id="inventory" icon={Package} label="Estoque" />
                    <NavItem id="analytics" icon={BarChart3} label="Impacto" />
                    <NavItem id="reviews" icon={MessageSquare} label="Feedback" />
                    <NavItem id="store" icon={Settings} label="Perfil" />
                </nav>
            </div >

            {/* Premium Notifications Overlay */}
            < AnimatePresence >
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 pointer-events-none"
                    >
                        <div className={`bg-white p-10 rounded-[48px] shadow-2xl flex flex-col items-center text-center space-y-4 border-2 ${notification.type === 'success' ? 'border-green-400/20' : 'border-red-400/20'}`}>
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${notification.type === 'success' ? 'bg-green-500 shadow-green-200 animate-bounce' : 'bg-red-500 shadow-red-200'}`}>
                                {notification.type === 'success' ? <CheckCircle2 size={40} className="text-white" /> : <AlertCircle size={40} className="text-white" />}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black italic uppercase text-gray-900 leading-none">{notification.message}</h2>
                                {notification.subMessage && (
                                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">{notification.subMessage}</p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence >
            {/* Chat Modal */}
            {selectedOrderForChat && (
                <OrderChat
                    orderId={selectedOrderForChat.id}
                    userId={userData.id}
                    onClose={() => setSelectedOrderForChat(null)}
                />
            )}
        </div >
    )
}

function OrderChat({ orderId, userId, onClose }) {
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchMessages()

        // Real-time subscription
        const channel = supabase
            .channel(`order-chat-${orderId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `order_id=eq.${orderId}`
            }, (payload) => {
                setMessages(prev => [...prev, payload.new])
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [orderId])

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

export default AdminPanel

