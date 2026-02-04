import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard, ShoppingBag, BarChart3, Settings, LogOut,
    Plus, Search, Store, Zap, Package, TrendingUp, DollarSign,
    Clock, CheckCircle2, AlertCircle, Printer, Filter, MessageSquare,
    ChevronRight, ArrowUpRight, Scale, Smartphone
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
        boostsUsed: 0
    })

    useEffect(() => {
        fetchAdminData()
    }, [])

    const fetchAdminData = async () => {
        setLoading(true)
        try {
            // 1. Fetch Store
            const { data: store } = await supabase.from('establishments').select('*').eq('id', userData.establishment_id).single()
            setEstablishment(store)

            // 2. Fetch Orders
            const { data: ordersData } = await supabase.from('orders').select('*, bags!inner(*)').eq('bags.establishment_id', userData.establishment_id)
            setOrders(ordersData || [])

            // 3. Fetch Bags
            const { data: bagsData } = await supabase.from('bags').select('*').eq('establishment_id', userData.establishment_id)
            setBags(bagsData || [])

            // 4. Boost usages
            const { count } = await supabase.from('boost_usages').select('*', { count: 'exact' }).eq('establishment_id', userData.establishment_id)

            // Calculate stats
            const completed = (ordersData || []).filter(o => o.status === 'completed')
            setStats({
                totalRevenue: completed.reduce((acc, curr) => acc + (curr.amount || 0), 0),
                ordersToday: completed.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length,
                kgSaved: completed.length * 1.5,
                boostsUsed: count || 0
            })

        } catch (error) {
            console.error('Error fetching admin data:', error)
        } finally {
            setLoading(false)
        }
    }

    const menuItems = [
        { id: 'orders', label: 'Pedidos Ativos', icon: ShoppingBag, color: 'text-primary' },
        { id: 'inventory', label: 'Sacolas Surpresa', icon: Package, color: 'text-secondary' },
        { id: 'analytics', label: 'Desempenho', icon: BarChart3, color: 'text-blue-500' },
        { id: 'chats', label: 'Chat com Clientes', icon: MessageSquare, color: 'text-purple-500' },
        { id: 'settings', label: 'Dados da Loja', icon: Settings, color: 'text-gray-400' },
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
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loja Aberta</span>
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
                            {item.id === 'orders' && orders.filter(o => o.status === 'pending').length > 0 && (
                                <span className="bg-urgency text-white text-[10px] px-2 py-0.5 rounded-full shadow-lg shadow-urgency/20">
                                    {orders.filter(o => o.status === 'pending').length}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-8 border-t border-gray-50 space-y-2">
                    <button
                        onClick={onSwitchMode}
                        className="w-full flex items-center justify-center gap-2 py-4 text-xs font-black text-secondary hover:text-primary uppercase tracking-widest transition-colors border-b border-gray-50 mb-2"
                    >
                        <Smartphone size={16} />
                        Mudar para Versão App
                    </button>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 py-4 text-xs font-black text-red-400 hover:text-red-500 uppercase tracking-widest transition-colors"
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
                            { label: 'Pedidos Hoje', value: stats.ordersToday, icon: ShoppingBag, color: 'bg-primary' },
                            { label: 'KG Salvos', value: `${stats.kgSaved.toFixed(1)} KG`, icon: Scale, color: 'bg-secondary' },
                            { label: 'Impulsos Ativos', value: stats.boostsUsed, icon: Zap, color: 'bg-orange-500' },
                        ].map((metric, i) => (
                            <div key={i} className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-50 flex flex-col justify-between group hover:shadow-xl hover:shadow-gray-100 transition-all">
                                <div className={`${metric.color} w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-${metric.color.split('-')[1]}-200`}>
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
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-8"
                            >
                                <div className="flex justify-between items-center">
                                    <h2 className="text-3xl font-black text-gray-900 italic uppercase">Pedidos pendentes</h2>
                                    <div className="flex gap-4">
                                        <button className="bg-surface-soft p-3 rounded-xl text-gray-400 hover:text-primary transition-colors">
                                            <Printer size={20} />
                                        </button>
                                        <button className="bg-surface-soft p-3 rounded-xl text-gray-400 hover:text-primary transition-colors">
                                            <Filter size={20} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {orders.filter(o => o.status !== 'completed').map((order) => (
                                        <div key={order.id} className="bg-white p-8 rounded-[40px] border border-gray-100 flex items-center justify-between group hover:border-primary/20 transition-all">
                                            <div className="flex items-center gap-8">
                                                <div className="w-16 h-16 bg-surface-soft rounded-[24px] flex items-center justify-center text-primary">
                                                    <Package size={28} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="text-lg font-black text-gray-900 uppercase italic">{order.bags?.title}</h4>
                                                        <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${order.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                                                            }`}>
                                                            {order.status === 'pending' ? 'Aguardando Pagamento' : 'Pronto para Coleta'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-wider">ID: #{order.id.slice(0, 8)} • {new Date(order.created_at).toLocaleTimeString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-8">
                                                <div className="text-right">
                                                    <p className="text-2xl font-black text-primary italic">R$ {order.amount.toFixed(2)}</p>
                                                    <p className="text-[10px] font-black text-gray-300 uppercase">Total do Pedido</p>
                                                </div>
                                                <button className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-lg shadow-primary/10 hover:shadow-primary/30 transition-all">
                                                    Gerenciar Pedido
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {orders.filter(o => o.status !== 'completed').length === 0 && (
                                        <div className="py-20 text-center bg-white rounded-[40px] border border-dashed border-gray-200">
                                            <ShoppingBag size={48} className="text-gray-100 mx-auto mb-4" />
                                            <p className="text-gray-300 font-black uppercase text-sm">Nenhum pedido pendente no momento.</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'inventory' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-8"
                            >
                                <div className="flex justify-between items-center">
                                    <h2 className="text-3xl font-black text-gray-900 italic uppercase">Suas Sacolas</h2>
                                    <button className="bg-primary text-white px-10 py-5 rounded-3xl font-black text-sm uppercase shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                                        <Plus size={20} />
                                        Criar Nova Sacola
                                    </button>
                                </div>

                                <div className="grid grid-cols-3 gap-8">
                                    {bags.map((bag) => (
                                        <div key={bag.id} className="relative bg-white rounded-[48px] p-10 border border-gray-100 shadow-sm overflow-hidden group">
                                            {bag.is_urgent && (
                                                <div className="absolute top-0 right-0 bg-secondary text-white px-8 py-2 rounded-bl-[20px] font-black text-[10px] uppercase tracking-widest animate-pulse">
                                                    Impulsionado 🔥
                                                </div>
                                            )}

                                            <div className="space-y-6">
                                                <div className="w-16 h-16 bg-surface-soft rounded-3xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                                    <ShoppingBag size={32} />
                                                </div>
                                                <div>
                                                    <h4 className="text-xl font-black text-gray-900 uppercase italic truncate">{bag.title}</h4>
                                                    <p className="text-xs font-bold text-gray-400 mt-1">{bag.quantity} unidades disponíveis</p>
                                                </div>
                                                <div className="flex items-center justify-between py-6 border-y border-gray-50">
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Preço Original</p>
                                                        <p className="text-sm font-bold text-gray-400 line-through">R$ {bag.original_price.toFixed(2)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Preço Recife Save</p>
                                                        <p className="text-3xl font-black text-primary italic">R$ {bag.discounted_price.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <button className="py-4 bg-surface-soft rounded-2xl font-black text-[10px] uppercase text-gray-500 hover:bg-gray-100 transition-all">Editar</button>
                                                    <button className={`py-4 rounded-2xl font-black text-[10px] uppercase transition-all ${bag.is_active ? 'bg-secondary text-white' : 'bg-gray-100 text-gray-300'
                                                        }`}>
                                                        {bag.is_active ? 'Impulsionar' : 'Esgotado'}
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
        </div>
    )
}

export default AdminPanelWeb
