import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard, ShoppingBag, BarChart3, Settings, LogOut,
    Plus, Search, Store, Zap, Package, TrendingUp, DollarSign,
    Clock, CheckCircle2, AlertCircle, Printer, Filter, MessageSquare,
    ChevronRight, ArrowUpRight, Scale, Smartphone, Loader2,
    Trash2, Edit2, X, XCircle, Save
} from 'lucide-react'
import { supabase } from '../lib/supabase'

function AdminPanelWeb({ userData, onLogout, onSwitchMode }) {
    const [activeTab, setActiveTab] = useState('orders') // dashboard, orders, inventory, analytics
    const [loading, setLoading] = useState(true)
    const [establishment, setEstablishment] = useState(null)
    const [orders, setOrders] = useState([])
    const [bags, setBags] = useState([])
    const [stats, setStats] = useState({
        totalRevenue: 0,
        ordersToday: 0,
        kgSaved: 0,
        boostsUsed: 0,
        pendingCount: 0
    })

    const [isAddingBag, setIsAddingBag] = useState(false)
    const [isEditingBag, setIsEditingBag] = useState(null)
    const [actionLoading, setActionLoading] = useState(false)
    const [notification, setNotification] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')

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

    const fetchAdminData = useCallback(async () => {
        try {
            if (!userData?.establishment_id) return

            // 1. Store
            const { data: store } = await supabase.from('establishments').select('*').eq('id', userData.establishment_id).single()
            setEstablishment(store)

            // 2. Orders
            const { data: ordersData } = await supabase.from('orders').select('*, bags!inner(*)').eq('bags.establishment_id', userData.establishment_id)
            setOrders(ordersData || [])

            // 3. Bags
            const { data: bagsData } = await supabase.from('bags').select('*').eq('establishment_id', userData.establishment_id).order('created_at', { ascending: false })
            setBags(bagsData || [])

            // 4. Boost usages
            const { count } = await supabase.from('boost_usages').select('*', { count: 'exact' }).eq('establishment_id', userData.establishment_id)

            // Calculate stats
            const completed = (ordersData || []).filter(o => o.status === 'completed')
            setStats({
                totalRevenue: completed.reduce((acc, curr) => acc + (curr.amount || 0), 0),
                ordersToday: completed.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length,
                pendingCount: (ordersData || []).filter(o => o.status === 'pending').length,
                kgSaved: completed.length * 1.5,
                boostsUsed: count || 0
            })

        } catch (error) {
            console.error('Error fetching admin data:', error)
        } finally {
            setLoading(false)
        }
    }, [userData?.establishment_id])

    useEffect(() => {
        fetchAdminData()
    }, [fetchAdminData])

    const showNotify = (type, message, subMessage = '') => {
        setNotification({ type, message, subMessage })
        setTimeout(() => setNotification(null), 3000)
    }

    const handleDeleteBag = async (id) => {
        if (!confirm('Deseja realmente excluir esta sacola?')) return
        try {
            const { error } = await supabase.from('bags').delete().eq('id', id)
            if (error) throw error
            showNotify('success', 'EXCLUÍDO', 'Sacola removida com sucesso.')
            fetchAdminData()
        } catch (e) { showNotify('error', 'ERRO', e.message) }
    }

    const handleSaveBag = async () => {
        if (!bagForm.title || !bagForm.discounted_price) return
        setActionLoading(true)
        try {
            const payload = {
                ...bagForm,
                establishment_id: userData.establishment_id,
                original_price: parseFloat(bagForm.original_price),
                discounted_price: parseFloat(bagForm.discounted_price),
                quantity: parseInt(bagForm.quantity)
            }

            if (isEditingBag) {
                const { error } = await supabase.from('bags').update(payload).eq('id', isEditingBag)
                if (error) throw error
                showNotify('success', 'ATUALIZADO', 'Sacola editada com sucesso.')
            } else {
                const { error } = await supabase.from('bags').insert([payload])
                if (error) throw error
                showNotify('success', 'CRIADO', 'Nova sacola disponível para venda.')
            }

            setIsAddingBag(false)
            setIsEditingBag(null)
            setBagForm({ title: '', original_price: '', discounted_price: '', quantity: 1, type: 'Mista', pickup_window: '18:00-20:00', description: '', dietary_filters: [] })
            fetchAdminData()
        } catch (e) { showNotify('error', 'ERRO', e.message) }
        finally { setActionLoading(false) }
    }

    const handleBoostBag = async (bag) => {
        const currentFee = establishment?.boost_fee || 2.00
        const isActivating = !bag.is_urgent

        if (isActivating && !confirm(`Deseja ativar o IMPULSO? Uma taxa de R$ ${currentFee} será contabilizada para esta sacola.`)) {
            return
        }

        try {
            const { error } = await supabase.from('bags').update({ is_urgent: isActivating }).eq('id', bag.id)
            if (error) throw error

            if (isActivating) {
                await supabase.from('boost_usages').insert([{
                    establishment_id: userData.establishment_id,
                    bag_id: bag.id,
                    fee_at_time: currentFee
                }])
            }

            showNotify('success', isActivating ? 'IMPULSO ATIVADO' : 'IMPULSO DESATIVADO', isActivating ? `Taxa de R$ ${currentFee} aplicada.` : 'Sua sacola voltou ao modo padrão.')
            fetchAdminData()
        } catch (e) { showNotify('error', 'ERRO', e.message) }
    }

    if (loading || !userData) {
        return (
            <div className="min-h-screen bg-surface-soft flex flex-col items-center justify-center p-8 space-y-4">
                <Loader2 className="animate-spin text-primary w-12 h-12" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] animate-pulse">Carregando Painel do Lojista...</p>
            </div>
        )
    }

    const menuItems = [
        { id: 'orders', label: 'Pedidos Ativos', icon: ShoppingBag },
        { id: 'inventory', label: 'Sacolas Surpresa', icon: Package },
        { id: 'analytics', label: 'Desempenho', icon: BarChart3 },
        { id: 'settings', label: 'Dados da Loja', icon: Settings },
    ]

    return (
        <div className="min-h-screen bg-gray-50 flex font-outfit">
            {/* Merchant Sidebar */}
            <aside className="w-80 bg-white border-r border-gray-100 flex flex-col sticky top-0 h-screen">
                <div className="p-8 space-y-8">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
                            <Store className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black italic uppercase text-gray-900 leading-none">Vendedor</h2>
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest mt-1 block">Portal do Lojista</span>
                        </div>
                    </div>

                    <div className="bg-surface-soft p-5 rounded-[32px] border border-gray-50 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loja Aberta</span>
                            </div>
                            <button className="text-[10px] font-black text-primary uppercase underline">Editar Status</button>
                        </div>
                        <h3 className="text-sm font-black uppercase italic text-gray-900 truncate">{establishment?.name}</h3>
                        <p className="text-[10px] text-gray-400 font-bold leading-tight">{establishment?.address}</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-tight transition-all group ${activeTab === item.id
                                    ? 'bg-primary text-white shadow-xl shadow-primary/20'
                                    : 'text-gray-400 hover:bg-surface-soft hover:text-gray-900'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <item.icon size={20} />
                                {item.label}
                            </div>
                            {item.id === 'orders' && stats.pendingCount > 0 && (
                                <span className="bg-urgency text-white text-[10px] px-2 py-0.5 rounded-full shadow-lg shadow-urgency/20">
                                    {stats.pendingCount}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-8 border-t border-gray-50 space-y-2">
                    <button
                        onClick={onSwitchMode}
                        className="w-full flex items-center justify-center gap-2 py-4 text-xs font-black text-secondary hover:text-primary uppercase tracking-widest transition-all border-b border-gray-50 mb-2"
                    >
                        <Smartphone size={16} />
                        Mudar para Versão App
                    </button>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 py-4 text-[10px] font-black text-red-500 hover:bg-red-50 rounded-2xl uppercase tracking-widest transition-colors"
                    >
                        <LogOut size={16} />
                        Sair do Painel
                    </button>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 p-12 overflow-y-auto">
                <div className="max-w-7xl mx-auto space-y-12">
                    {/* Metrics Dashboard */}
                    <div className="grid grid-cols-4 gap-8">
                        {[
                            { label: 'Receita Total', value: `R$ ${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'bg-green-500' },
                            { label: 'Pedidos Ontem/Hoje', value: stats.ordersToday, icon: ShoppingBag, color: 'bg-primary' },
                            { label: 'Impacto (KG)', value: `${stats.kgSaved.toFixed(1)}kg`, icon: Scale, color: 'bg-secondary' },
                            { label: 'Impulsos Utilizados', value: stats.boostsUsed, icon: Zap, color: 'bg-orange-500' },
                        ].map((metric, i) => (
                            <div key={i} className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-50 flex flex-col justify-between group hover:shadow-xl hover:shadow-gray-100 transition-all">
                                <div className={`${metric.color} w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                                    <metric.icon size={24} />
                                </div>
                                <div className="mt-6">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{metric.label}</p>
                                    <h3 className="text-2xl font-black text-gray-900 mt-1 italic">{metric.value}</h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Dynamic Content */}
                    <AnimatePresence mode="wait">
                        {activeTab === 'orders' && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-3xl font-black text-gray-900 italic uppercase">Gestão de Pedidos</h2>
                                    <div className="flex gap-4">
                                        <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 flex items-center gap-3 shadow-sm focus-within:border-primary transition-all">
                                            <Search className="text-gray-300" size={18} />
                                            <input type="text" placeholder="Buscar pedido ou cliente..." className="outline-none text-sm font-bold text-gray-700 w-64" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {orders.filter(o => o.status !== 'completed').map((order) => (
                                        <div key={order.id} className="bg-white p-8 rounded-[40px] border border-gray-100 flex items-center justify-between group hover:border-primary/20 transition-all">
                                            <div className="flex items-center gap-8">
                                                <div className="w-16 h-16 bg-surface-soft rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                    <Package size={28} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="text-lg font-black text-gray-900 uppercase italic">{order.bags?.title}</h4>
                                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${order.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                                                            }`}>
                                                            {order.status === 'pending' ? 'Aguardando Pagamento' : 'Pronto para Coleta'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] font-bold text-gray-400 mt-1 uppercase tracking-wider">#{order.id.slice(0, 8)} • ID Cliente: {order.user_id.slice(0, 6)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-12">
                                                <div className="text-right">
                                                    <p className="text-2xl font-black text-primary italic">R$ {order.amount.toFixed(2)}</p>
                                                    <p className="text-[10px] font-black text-gray-300 uppercase">Total do Pedido</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button className="p-4 bg-surface-soft text-gray-400 rounded-2xl hover:text-primary hover:bg-white transition-all shadow-sm">
                                                        <MessageSquare size={20} />
                                                    </button>
                                                    <button className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-lg shadow-primary/10 hover:shadow-primary/30 active:scale-95 transition-all">
                                                        Finalizar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {orders.filter(o => o.status !== 'completed').length === 0 && (
                                        <div className="py-32 text-center bg-white rounded-[48px] border-2 border-dashed border-gray-100">
                                            <ShoppingBag size={64} className="text-gray-100 mx-auto mb-6" />
                                            <h4 className="text-lg font-black text-gray-200 uppercase tracking-widest italic">Sem pedidos pendentes no momento</h4>
                                            <p className="text-gray-300 text-xs mt-2 uppercase font-bold px-10">Novos pedidos aparecerão aqui instantaneamente conforme os clientes compram.</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'inventory' && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-10">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-3xl font-black text-gray-900 italic uppercase">Suas Sacolas</h2>
                                    <button
                                        onClick={() => setIsAddingBag(true)}
                                        className="bg-primary text-white px-10 py-5 rounded-3xl font-black text-sm uppercase shadow-2xl shadow-primary/20 hover:scale-[1.05] active:scale-95 transition-all flex items-center gap-3"
                                    >
                                        <Plus size={20} />
                                        Criar Nova Sacola
                                    </button>
                                </div>

                                <div className="grid grid-cols-3 gap-8">
                                    {bags.map((bag) => (
                                        <div key={bag.id} className="relative bg-white rounded-[48px] p-10 border border-gray-100 shadow-sm overflow-hidden group hover:border-secondary/20 transition-all">
                                            {bag.is_urgent && (
                                                <div className="absolute top-0 right-0 bg-secondary text-white px-10 py-2.5 rounded-bl-[24px] font-black text-[10px] uppercase tracking-widest animate-pulse flex items-center gap-2">
                                                    <Zap size={10} fill="white" /> Impulsionado
                                                </div>
                                            )}

                                            <div className="space-y-8">
                                                <div className="w-16 h-16 bg-surface-soft rounded-3xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                                    <ShoppingBag size={32} />
                                                </div>
                                                <div>
                                                    <h4 className="text-2xl font-black text-gray-900 uppercase italic truncate leading-none">{bag.title}</h4>
                                                    <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-wide">{bag.quantity} unidades • {bag.type}</p>
                                                </div>
                                                <div className="flex items-center justify-between py-8 border-y border-gray-50">
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">De:</p>
                                                        <p className="text-sm font-bold text-gray-400 line-through">R$ {bag.original_price.toFixed(2)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Por Recife Save:</p>
                                                        <p className="text-4xl font-black text-primary italic leading-none mt-1">R$ {bag.discounted_price.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <button
                                                        onClick={() => {
                                                            setIsEditingBag(bag.id)
                                                            setBagForm(bag)
                                                            setIsAddingBag(true)
                                                        }}
                                                        className="py-4 bg-surface-soft rounded-2xl font-black text-[10px] uppercase text-gray-500 hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Edit2 size={12} /> Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleBoostBag(bag)}
                                                        className={`py-4 rounded-2xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${bag.is_urgent ? 'bg-secondary text-white shadow-lg shadow-secondary/20' : 'bg-surface-soft text-secondary hover:bg-secondary/10'
                                                            }`}
                                                    >
                                                        <Zap size={12} fill={bag.is_urgent ? "white" : "none"} />
                                                        {bag.is_urgent ? 'Impulsionado' : 'Impulsionar'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Modals & Notifications */}
            <AnimatePresence>
                {isAddingBag && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-8">
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-10 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-primary/10 p-3 rounded-2xl text-primary">
                                        <Package />
                                    </div>
                                    <h3 className="text-2xl font-black italic uppercase text-gray-900">{isEditingBag ? 'Editar Sacola' : 'Nova Sacola Surpresa'}</h3>
                                </div>
                                <button onClick={() => { setIsAddingBag(false); setIsEditingBag(null); }} className="text-gray-300 hover:text-gray-900">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="p-10 overflow-y-auto space-y-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2 italic">Título da Sacola</label>
                                    <input
                                        value={bagForm.title}
                                        onChange={(e) => setBagForm({ ...bagForm, title: e.target.value })}
                                        placeholder="Ex: Sacola Mista do Dia"
                                        className="w-full bg-surface-soft border border-gray-50 p-5 rounded-3xl font-black text-sm outline-none focus:border-primary transition-all shadow-inner"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2 italic">Preço Original (R$)</label>
                                        <input
                                            type="number"
                                            value={bagForm.original_price}
                                            onChange={(e) => setBagForm({ ...bagForm, original_price: e.target.value })}
                                            placeholder="Ex: 50.00"
                                            className="w-full bg-surface-soft border border-gray-50 p-5 rounded-3xl font-black text-sm outline-none focus:border-primary transition-all shadow-inner"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] px-2 italic">Preço Recife Save (R$)</label>
                                        <input
                                            type="number"
                                            value={bagForm.discounted_price}
                                            onChange={(e) => setBagForm({ ...bagForm, discounted_price: e.target.value })}
                                            placeholder="Ex: 19.90"
                                            className="w-full bg-surface-soft border border-gray-50 p-5 rounded-3xl font-black text-sm outline-none focus:border-primary border-2 border-primary/20 shadow-xl shadow-primary/5"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-6">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2 italic">Quantidade</label>
                                        <input
                                            type="number"
                                            value={bagForm.quantity}
                                            onChange={(e) => setBagForm({ ...bagForm, quantity: e.target.value })}
                                            className="w-full bg-surface-soft border border-gray-50 p-5 rounded-3xl font-black text-sm outline-none focus:border-primary"
                                        />
                                    </div>
                                    <div className="space-y-4 col-span-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2 italic">Janela de Retirada</label>
                                        <input
                                            value={bagForm.pickup_window}
                                            onChange={(e) => setBagForm({ ...bagForm, pickup_window: e.target.value })}
                                            placeholder="Ex: 18:00 - 20:30"
                                            className="w-full bg-surface-soft border border-gray-50 p-5 rounded-3xl font-black text-sm outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 bg-gray-50 flex gap-6">
                                <button onClick={() => setIsAddingBag(false)} className="flex-1 py-5 rounded-3xl font-black text-xs uppercase text-gray-400 hover:bg-gray-100">Cancelar</button>
                                <button
                                    onClick={handleSaveBag}
                                    disabled={actionLoading}
                                    className="flex-[2] bg-primary text-white py-5 rounded-3xl font-black text-xs uppercase shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {actionLoading ? <Loader2 className="animate-spin" /> : <Save />}
                                    {isEditingBag ? 'Salvar Alterações' : 'Publicar Sacola'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {notification && (
                    <motion.div initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }} className="fixed bottom-12 right-12 z-[500]">
                        <div className={`bg-white p-6 rounded-[32px] shadow-2xl border-l-[12px] flex items-center gap-6 min-w-[350px] ${notification.type === 'success' ? 'border-primary' : 'border-red-500'}`}>
                            <div className={`p-4 rounded-2xl ${notification.type === 'success' ? 'bg-primary/10 text-primary' : 'bg-red-50 text-red-500'}`}>
                                {notification.type === 'success' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                            </div>
                            <div>
                                <h4 className="text-base font-black uppercase text-gray-900 leading-none">{notification.message}</h4>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">{notification.subMessage}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default AdminPanelWeb
