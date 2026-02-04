import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ShieldCheck, Users, Store, TrendingUp, Settings, LogOut,
    Mail, Phone, MapPin, ArrowRight, Star, BarChart, PieChart,
    ChevronRight, UserPlus, Filter, Zap, LayoutDashboard, DollarSign,
    CheckCircle2, XCircle, Search, Trash2, Power, Smartphone
} from 'lucide-react'
import { supabase } from '../lib/supabase'

function SuperAdminPanelWeb({ userData, onLogout, onSwitchMode }) {
    const [activeTab, setActiveTab] = useState('overview') // overview, users, merchants, financial
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalMerchants: 0,
        totalOrders: 0,
        volumeTotal: 0,
        commission: 0,
        boostRevenue: 0
    })
    const [users, setUsers] = useState([])
    const [merchants, setMerchants] = useState([])
    const [notification, setNotification] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchSuperData()
    }, [])

    const fetchSuperData = async () => {
        setLoading(true)
        try {
            const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
            const { data: establishments } = await supabase.from('establishments').select('*').order('name')
            const { data: orders } = await supabase.from('orders').select('amount').eq('status', 'completed')
            const { data: boosts } = await supabase.from('boost_usages').select('fee_at_time')

            const totalVol = orders?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0
            const totalBoost = boosts?.reduce((acc, curr) => acc + (curr.fee_at_time || 0), 0) || 0

            setUsers(profiles || [])
            setMerchants(establishments || [])
            setStats({
                totalUsers: profiles?.length || 0,
                totalMerchants: establishments?.length || 0,
                totalOrders: orders?.length || 0,
                volumeTotal: totalVol,
                commission: totalVol * 0.15,
                boostRevenue: totalBoost
            })
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    const showNotify = (type, message, subMessage) => {
        setNotification({ type, message, subMessage })
        setTimeout(() => setNotification(null), 3000)
    }

    const menuItems = [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'users', label: 'Usuários', icon: Users },
        { id: 'merchants', label: 'Estabelecimentos', icon: Store },
        { id: 'financial', label: 'Financeiro', icon: DollarSign },
        { id: 'settings', label: 'Configurações', icon: Settings },
    ]

    return (
        <div className="min-h-screen bg-gray-50 flex font-outfit">
            {/* Desktop Sidebar */}
            <aside className="w-80 bg-white border-r border-gray-100 flex flex-col sticky top-0 h-screen">
                <div className="p-8 flex items-center gap-4">
                    <div className="bg-secondary p-3 rounded-2xl shadow-lg shadow-secondary/20">
                        <ShieldCheck className="text-white" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black italic uppercase text-gray-900 leading-none">Recife Save</h2>
                        <span className="text-[10px] font-black text-secondary uppercase tracking-widest mt-1 block">Master Admin Panel</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-tight transition-all ${activeTab === item.id
                                ? 'bg-secondary text-white shadow-xl shadow-secondary/20'
                                : 'text-gray-400 hover:bg-surface-soft hover:text-gray-900'
                                }`}
                        >
                            <item.icon size={20} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-8 border-t border-gray-50 space-y-4">
                    <div className="bg-surface-soft p-4 rounded-2xl flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-secondary">
                            {userData?.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-gray-900 truncate">{userData?.full_name}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Super Administrador</p>
                        </div>
                    </div>
                    <button
                        onClick={onSwitchMode}
                        className="w-full flex items-center justify-center gap-2 py-4 text-xs font-black text-secondary hover:text-primary uppercase tracking-widest transition-colors border-b border-gray-50 mb-2"
                    >
                        <Smartphone size={16} />
                        Mudar para Versão App
                    </button>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 py-4 text-xs font-black text-red-400 hover:text-red-500 uppercase tracking-widest border-t border-gray-50"
                    >
                        <LogOut size={16} />
                        Sair da Conta
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-12 overflow-y-auto">
                <div className="max-w-7xl mx-auto space-y-12">
                    {/* Page Header */}
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 italic uppercase">
                                {menuItems.find(m => m.id === activeTab)?.label}
                            </h1>
                            <p className="text-gray-400 font-bold uppercase text-xs tracking-[0.2em] mt-2">Visão geral do ecossistema Recife Save</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 flex items-center gap-3 shadow-sm">
                                <Search className="text-gray-300" size={18} />
                                <input
                                    type="text"
                                    placeholder="Pesquisar global..."
                                    className="outline-none text-sm font-bold text-gray-700 w-48"
                                />
                            </div>
                            <button className="bg-primary text-white px-8 py-3 rounded-2xl font-black text-sm uppercase shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2">
                                <Plus size={18} />
                                Novo
                            </button>
                        </div>
                    </div>

                    {/* Dashboard Cards Grid */}
                    {activeTab === 'overview' && (
                        <div className="space-y-10">
                            <div className="grid grid-cols-4 gap-8">
                                {[
                                    { label: 'Total de Vendas', value: stats.totalOrders, icon: TrendingUp, color: 'bg-green-500' },
                                    { label: 'Volume (GMV)', value: `R$ ${stats.volumeTotal.toFixed(2)}`, icon: DollarSign, color: 'bg-blue-500' },
                                    { label: 'Comissões', value: `R$ ${stats.commission.toFixed(2)}`, icon: PieChart, color: 'bg-secondary' },
                                    { label: 'Taxas Adicionais', value: `R$ ${stats.boostRevenue.toFixed(2)}`, icon: Zap, color: 'bg-orange-500' },
                                ].map((card, i) => (
                                    <div key={i} className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-50 space-y-4">
                                        <div className={`${card.color} w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                                            <card.icon size={24} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{card.label}</p>
                                            <h3 className="text-2xl font-black text-gray-900 mt-1 italic">{card.value}</h3>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-3 gap-8">
                                <section className="col-span-2 bg-white rounded-[48px] p-10 border border-gray-50 shadow-sm space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-black uppercase italic text-gray-900">Histórico de Volume</h3>
                                        <Filter className="text-gray-300" size={20} />
                                    </div>
                                    <div className="h-64 bg-gray-50 rounded-[32px] flex items-end justify-between px-10 pb-6">
                                        {/* Mock Chart */}
                                        {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                                            <div key={i} className="w-12 bg-secondary/10 rounded-t-xl relative group">
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${h}%` }}
                                                    className="w-full bg-secondary rounded-t-xl group-hover:bg-primary transition-colors"
                                                />
                                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-gray-300 uppercase">Seg</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="bg-white rounded-[48px] p-10 border border-gray-50 shadow-sm space-y-8">
                                    <h3 className="text-lg font-black uppercase italic text-gray-900">Metas ESG</h3>
                                    <div className="flex flex-col items-center gap-6">
                                        <div className="relative w-40 h-40">
                                            <svg className="w-full h-full" viewBox="0 0 36 36">
                                                <path className="text-gray-100" strokeDasharray="100, 100" strokeWidth="3" fill="none" stroke="currentColor" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                <path className="text-green-500" strokeDasharray="75, 100" strokeWidth="3" strokeLinecap="round" fill="none" stroke="currentColor" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-2xl font-black text-gray-900 leading-none">75%</span>
                                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">Concluído</span>
                                            </div>
                                        </div>
                                        <p className="text-center text-xs text-gray-400 font-bold uppercase tracking-wider leading-relaxed">
                                            Faltam apenas 2 toneladas para batermos a meta mensal de Recife.
                                        </p>
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}

                    {/* Table View for Merchants/Users */}
                    {(activeTab === 'merchants' || activeTab === 'users') && (
                        <div className="bg-white rounded-[48px] overflow-hidden border border-gray-50 shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Identificação</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria / Cargo</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cadastro</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {(activeTab === 'merchants' ? merchants : users).map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/20 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-surface-soft rounded-2xl flex items-center justify-center font-black text-gray-900 uppercase">
                                                        {item.name?.charAt(0) || item.full_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900 uppercase italic">{item.name || item.full_name}</p>
                                                        <p className="text-[10px] font-bold text-gray-400">{item.phone || item.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="px-4 py-1.5 bg-secondary/5 text-secondary text-[10px] font-black rounded-full uppercase tracking-widest border border-secondary/10">
                                                    {item.category || item.role}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                                                    <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Ativo</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-[10px] font-bold text-gray-400 uppercase">
                                                {new Date(item.created_at).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="p-3 bg-surface-soft text-gray-400 rounded-xl hover:text-secondary hover:bg-white border border-transparent hover:border-secondary/20 shadow-sm transition-all">
                                                        <Settings size={16} />
                                                    </button>
                                                    <button className="p-3 bg-surface-soft text-gray-400 rounded-xl hover:text-red-500 hover:bg-white border border-transparent hover:border-red-100 shadow-sm transition-all">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            <AnimatePresence>
                {notification && (
                    <motion.div initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }} className="fixed bottom-12 right-12 z-[500]">
                        <div className="bg-white p-6 rounded-[28px] shadow-2xl border-l-8 border-secondary flex items-center gap-4 min-w-[300px]">
                            <div className="bg-secondary/10 p-3 rounded-xl text-secondary">
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase text-gray-900">{notification.message}</h4>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{notification.subMessage}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default SuperAdminPanelWeb
