import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ShieldCheck,
    Users,
    Store,
    DollarSign,
    Plus,
    Search,
    Loader2,
    CheckCircle2,
    XCircle,
    Building2,
    TrendingUp,
    Settings,
    LogOut,
    ExternalLink,
    Mail,
    Phone,
    MapPin,
    ArrowRight,
    Star,
    BarChart,
    PieChart,
    ChevronRight,
    Lock,
    Unlock,
    UserPlus,
    Filter,
    Zap
} from 'lucide-react'
import { supabase } from '../lib/supabase'

function SuperAdminPanel({ userData, onLogout }) {
    const [activeTab, setActiveTab] = useState('overview') // overview, merchants, users, financial
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalMerchants: 0,
        totalOrders: 0,
        volumeTotal: 0,
        commission: 0
    })
    const [merchants, setMerchants] = useState([])
    const [users, setUsers] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isAddingMerchant, setIsAddingMerchant] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)

    // Notification system
    const [notification, setNotification] = useState(null)
    const showNotify = (type, message, subMessage = '') => {
        setNotification({ type, message, subMessage })
        setTimeout(() => setNotification(null), 3000)
    }

    const [newMerchant, setNewMerchant] = useState({
        name: '',
        category: 'Mista',
        address: '',
        phone: '',
        description: ''
    })

    useEffect(() => {
        fetchSuperData()
    }, [])

    const fetchSuperData = async () => {
        setLoading(true)
        try {
            // 1. Fetch Stats
            const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
            const { count: merchantCount } = await supabase.from('establishments').select('*', { count: 'exact', head: true })
            const { data: orders } = await supabase.from('orders').select('amount').eq('status', 'completed')

            const totalVol = orders?.reduce((acc, current) => acc + (current.amount || 0), 0) || 0

            setStats({
                totalUsers: userCount || 0,
                totalMerchants: merchantCount || 0,
                totalOrders: orders?.length || 0,
                volumeTotal: totalVol,
                commission: totalVol * 0.15 // Example 15% commission
            })

            // 2. Fetch Lists
            const { data: merchantsList } = await supabase.from('establishments').select('*').order('created_at', { ascending: false })
            const { data: usersList } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })

            setMerchants(merchantsList || [])
            setUsers(usersList || [])

        } catch (error) {
            console.error('Error fetching super stats:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateMerchant = async () => {
        if (!newMerchant.name || !newMerchant.address) return
        setActionLoading(true)
        try {
            const { error } = await supabase
                .from('establishments')
                .insert([newMerchant])

            if (error) throw error

            showNotify('success', 'LOJISTA CADASTRADO', `${newMerchant.name} agora faz parte da rede.`)
            setIsAddingMerchant(false)
            setNewMerchant({ name: '', category: 'Mista', address: '', phone: '', description: '' })
            fetchSuperData()
        } catch (error) {
            showNotify('error', 'FALHA NO CADASTRO', error.message)
        } finally {
            setActionLoading(false)
        }
    }

    const toggleUserRole = async (userId, currentRole) => {
        const newRole = currentRole === 'merchant' ? 'customer' : 'merchant'
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId)

            if (error) throw error
            showNotify('success', 'NÍVEL ALTERADO', `Usuário agora é ${newRole.toUpperCase()}.`)
            fetchSuperData()
        } catch (error) {
            showNotify('error', 'FALHA AO ALTERAR', error.message)
        }
    }

    const togglePromotion = async (storeId, currentStatus) => {
        try {
            const { error } = await supabase
                .from('establishments')
                .update({ is_promoted: !currentStatus })
                .eq('id', storeId)

            if (error) throw error
            showNotify('success', !currentStatus ? 'LOJA PROMOVIDA' : 'PROMOÇÃO REMOVIDA', 'Visibilidade atualizada no app.')
            fetchSuperData()
        } catch (error) {
            showNotify('error', 'FALHA AO PROMOVER', error.message)
        }
    }

    const linkMerchantToStore = async (userId, storeId) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ establishment_id: storeId, role: 'merchant' })
                .eq('id', userId)

            if (error) throw error
            showNotify('success', 'ACESSO LIBERADO', 'Lojista vinculado ao estabelecimento.')
            fetchSuperData()
        } catch (error) {
            showNotify('error', 'FALHA AO VINCULAR', error.message)
        }
    }

    if (loading) {
        return (
            <div className="flex-1 min-h-screen bg-surface-soft flex flex-col items-center justify-center p-8 space-y-4">
                <ShieldCheck size={48} className="text-secondary animate-pulse" />
                <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Autenticando Super Admin...</p>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col min-h-screen bg-surface-soft pb-32 font-outfit">
            {/* Header Super Admin */}
            <header className="bg-white p-8 sticky top-0 z-40 border-b border-gray-100 shadow-sm">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-5">
                        <div className="bg-secondary p-4 rounded-[24px] shadow-lg shadow-secondary/20 rotate-3">
                            <ShieldCheck className="text-white w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black italic uppercase tracking-tight text-gray-900">Control Center</h1>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Master Admin Access • v1.0.6</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex flex-col items-end mr-4">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Operador</span>
                            <span className="text-sm font-black text-gray-900 italic uppercase">{userData?.full_name}</span>
                        </div>
                        <button onClick={onLogout} className="bg-surface-soft p-4 rounded-[22px] text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-90">
                            <LogOut size={22} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full p-6 space-y-10">

                {/* Global Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-7 rounded-[40px] shadow-sm border border-gray-100 relative overflow-hidden group">
                        <Users className="absolute -right-4 -top-4 w-24 h-24 text-gray-50 group-hover:scale-110 transition-transform" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Usuários Ativos</p>
                        <h2 className="text-3xl font-black text-gray-900 mt-2">{stats.totalUsers}</h2>
                    </div>
                    <div className="bg-white p-7 rounded-[40px] shadow-sm border border-gray-100 relative overflow-hidden group">
                        <Store className="absolute -right-4 -top-4 w-24 h-24 text-gray-50 group-hover:scale-110 transition-transform" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Lojistas Parceiros</p>
                        <h2 className="text-3xl font-black text-gray-900 mt-2">{stats.totalMerchants}</h2>
                    </div>
                    <div className="bg-secondary p-7 rounded-[40px] shadow-xl shadow-secondary/20 text-white relative overflow-hidden group">
                        <DollarSign className="absolute -right-4 -top-4 w-24 h-24 opacity-10 group-hover:scale-110 transition-transform" />
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70 italic text-white">Volume Global (GMV)</p>
                        <h2 className="text-3xl font-black mt-2">R$ {stats.volumeTotal.toFixed(2)}</h2>
                    </div>
                    <div className="bg-primary p-7 rounded-[40px] shadow-xl shadow-primary/20 text-white relative overflow-hidden group">
                        <TrendingUp className="absolute -right-4 -top-4 w-24 h-24 opacity-10 group-hover:scale-110 transition-transform" />
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70 italic text-white">Monetização (Est.)</p>
                        <h2 className="text-3xl font-black mt-2">R$ {stats.commission.toFixed(2)}</h2>
                    </div>
                </div>

                {/* Main Content Sections */}
                <div className="bg-white rounded-[50px] shadow-sm border border-gray-100 overflow-hidden min-h-[600px]">
                    <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-none bg-gray-50/30">
                        {[
                            { id: 'overview', label: 'Visão Geral', icon: <BarChart size={16} /> },
                            { id: 'merchants', label: 'Gestão de Lojistas', icon: <Store size={16} /> },
                            { id: 'users', label: 'Gestão de Usuários', icon: <Users size={16} /> },
                            { id: 'financial', label: 'Financeiro', icon: <DollarSign size={16} /> }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-8 py-6 text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 border-b-2 ${activeTab === tab.id
                                        ? 'text-secondary bg-white border-secondary shadow-[0_-4px_10px_rgba(0,0,0,0.02)]'
                                        : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-100/50'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-8">
                        {/* 1. OVERVIEW */}
                        {activeTab === 'overview' && (
                            <div className="animate-in fade-in duration-500 space-y-8">
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-black uppercase italic text-gray-800 flex items-center gap-2">
                                            <BarChart className="text-secondary" size={16} /> Crescimento Recente
                                        </h3>
                                        <div className="h-64 bg-surface-soft rounded-[40px] flex items-end justify-between p-8 gap-3">
                                            {[30, 50, 45, 70, 90, 60, 100].map((h, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${h}%` }}
                                                    className="flex-1 bg-secondary/20 rounded-t-xl hover:bg-secondary transition-colors cursor-help"
                                                    title={`Dia ${i + 1}: ${h} novos usuários`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-black uppercase italic text-gray-800 flex items-center gap-2">
                                            <CheckCircle2 className="text-green-500" size={16} /> Atividade da Plataforma
                                        </h3>
                                        <div className="space-y-3">
                                            {merchants.slice(0, 4).map(m => (
                                                <div key={m.id} className="bg-surface-soft p-5 rounded-[28px] flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center text-secondary">
                                                            <Store size={22} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black uppercase text-gray-800">{m.name}</p>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase">{m.category}</p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={18} className="text-gray-300 group-hover:text-secondary" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. MERCHANTS GESTION */}
                        {activeTab === 'merchants' && (
                            <div className="animate-in slide-in-from-right-4 duration-500 space-y-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Buscar estabelecimento..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-surface-soft border-2 border-transparent focus:border-secondary/10 p-4 pl-12 rounded-2xl font-bold text-sm outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setIsAddingMerchant(true)}
                                        className="bg-secondary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-secondary/20 flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                                    >
                                        <Plus size={20} /> Cadastrar Novo Lojista
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {merchants.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())).map(m => (
                                        <div key={m.id} className="bg-white border border-gray-100 p-7 rounded-[40px] space-y-5 hover:shadow-xl hover:shadow-gray-100 transition-all group relative">
                                            <div className="flex items-start justify-between">
                                                <div className="bg-surface-soft w-16 h-16 rounded-[24px] flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-white transition-colors">
                                                    <Building2 size={28} />
                                                </div>
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${m.is_open ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                    {m.is_open ? 'Ativo' : 'Pausado'}
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-black uppercase italic leading-tight text-gray-900">{m.name}</h4>
                                                <p className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] mt-1">{m.category}</p>
                                            </div>
                                            <div className="space-y-2 pt-2">
                                                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase">
                                                    <MapPin size={12} /> {m.address?.slice(0, 30)}...
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase">
                                                    <Phone size={12} /> {m.phone || 'Não inf.'}
                                                </div>
                                            </div>
                                            <div className="pt-4 flex gap-2">
                                                <button
                                                    onClick={() => togglePromotion(m.id, m.is_promoted)}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${m.is_promoted ? 'bg-yellow-100 text-yellow-600 shadow-inner' : 'bg-surface-soft text-gray-500 hover:bg-yellow-50 hover:text-yellow-600'}`}
                                                >
                                                    <Zap size={14} fill={m.is_promoted ? "currentColor" : "none"} />
                                                    {m.is_promoted ? 'Promovido' : 'Impulsionar'}
                                                </button>
                                                <button className="p-3 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all">
                                                    <ExternalLink size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 3. USERS MANAGEMENT */}
                        {activeTab === 'users' && (
                            <div className="animate-in slide-in-from-right-4 duration-500 space-y-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Buscar usuário por nome ou ID..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-surface-soft border-2 border-transparent focus:border-secondary/10 p-4 pl-12 rounded-2xl font-bold text-sm outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase">
                                        <Users size={14} /> {users.length} Registrados
                                    </div>
                                </div>

                                <div className="bg-surface-soft rounded-[30px] overflow-hidden border border-gray-100 shadow-inner">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50/80">
                                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Usuário</th>
                                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nível / Role</th>
                                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Estabelecimento (Vínculo)</th>
                                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {users.filter(u =>
                                                u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                u.id.includes(searchQuery)
                                            ).map(u => (
                                                <tr key={u.id} className="hover:bg-white transition-colors group">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-black text-gray-400 text-lg uppercase shadow-inner">
                                                                {u.full_name?.charAt(0) || 'U'}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black uppercase text-gray-900 leading-none">{u.full_name || 'Sem Nome'}</p>
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">ID: {u.id.slice(0, 8)}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${u.role === 'superadmin' ? 'bg-purple-100 text-purple-600' : u.role === 'merchant' ? 'bg-secondary/10 text-secondary' : 'bg-green-100 text-green-600'}`}>
                                                            {u.role === 'superadmin' ? 'SUPER ADMIN' : u.role === 'merchant' ? 'LOJISTA' : 'CLIENTE'}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-2">
                                                            <select
                                                                className="bg-white border border-gray-100 text-[10px] font-bold p-2 rounded-lg outline-none"
                                                                onChange={(e) => linkMerchantToStore(u.id, e.target.value)}
                                                                defaultValue={u.establishment_id || ''}
                                                            >
                                                                <option value="">VINCULAR LOJA...</option>
                                                                {merchants.map(m => (
                                                                    <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>
                                                                ))}
                                                            </select>
                                                            {u.establishment_id && (
                                                                <button
                                                                    onClick={() => linkMerchantToStore(u.id, null)}
                                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Remover Vínculo"
                                                                >
                                                                    <XCircle size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {/* Dropdown/Modal to link store would go here, for now a simple toggle */}
                                                            <button
                                                                onClick={() => toggleUserRole(u.id, u.role)}
                                                                className="p-3 bg-surface-soft text-gray-400 rounded-xl hover:text-secondary hover:bg-white hover:shadow-md transition-all"
                                                            >
                                                                <Settings size={18} />
                                                            </button>
                                                            <button className="p-3 bg-gray-50 text-gray-300 rounded-xl">
                                                                <Mail size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* 4. FINANCIAL (Monetization) */}
                        {activeTab === 'financial' && (
                            <div className="animate-in slide-in-from-right-4 duration-500 space-y-8">
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="bg-secondary p-10 rounded-[48px] text-white space-y-6 relative overflow-hidden">
                                        <TrendingUp className="absolute right-[-10px] bottom-[-10px] w-48 h-48 opacity-10" />
                                        <h4 className="text-sm font-black uppercase tracking-widest opacity-80">Receita Estimada da Plataforma (15%)</h4>
                                        <h2 className="text-5xl font-black italic">R$ {stats.commission.toFixed(2)}</h2>
                                        <div className="pt-4">
                                            <p className="text-[10px] font-bold uppercase opacity-60">Baseado em um volume de vendas de R$ {stats.volumeTotal.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-black uppercase italic text-gray-800">Principais Lojistas por Volume</h3>
                                        <div className="space-y-4">
                                            {merchants.slice(0, 3).map((m, i) => (
                                                <div key={m.id} className="bg-surface-soft p-6 rounded-[32px] flex items-center justify-between border border-transparent hover:border-secondary/20 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-secondary italic">
                                                            #{i + 1}
                                                        </div>
                                                        <p className="text-xs font-black uppercase text-gray-800">{m.name}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-black text-secondary">R$ {(Math.random() * 5000 + 1000).toFixed(2)}</p>
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase">Volume Mês</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-orange-50 p-8 rounded-[40px] border border-orange-100 flex items-center gap-6">
                                    <div className="bg-orange-500 p-4 rounded-3xl text-white shadow-lg shadow-orange-200">
                                        <PieChart size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-xs font-black uppercase italic text-orange-600">Modelo de Negócio Ativo</h4>
                                        <p className="text-[11px] font-bold text-orange-900/60 uppercase mt-1 leading-relaxed">
                                            A plataforma retém automaticamente 15% de cada transação efetuada. Os pagamentos são processados e repassados aos lojistas no fechamento quinzenal.
                                        </p>
                                    </div>
                                    <button className="bg-white text-orange-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-sm border border-orange-100 hover:scale-105 active:scale-95 transition-all">
                                        Simular Repasse
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Modal: Adicionar Lojista */}
            <AnimatePresence>
                {isAddingMerchant && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 px-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="bg-white w-full max-w-2xl rounded-[50px] shadow-2xl overflow-hidden flex flex-col"
                        >
                            <div className="p-10 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-secondary/10 p-3 rounded-2xl">
                                        <Store className="text-secondary" />
                                    </div>
                                    <h3 className="text-2xl font-black italic uppercase">Cadastrar Lojista</h3>
                                </div>
                                <button onClick={() => setIsAddingMerchant(false)} className="bg-surface-soft p-3 rounded-2xl text-gray-400">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="p-10 overflow-y-auto max-h-[70vh] space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Nome do Estabelecimento</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: Pão de Açúcar - Boa Viagem"
                                            value={newMerchant.name}
                                            onChange={(e) => setNewMerchant({ ...newMerchant, name: e.target.value })}
                                            className="w-full bg-surface-soft border border-gray-100 p-5 rounded-[24px] font-black uppercase text-xs focus:ring-4 ring-secondary/10 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Categoria Principal</label>
                                        <select
                                            value={newMerchant.category}
                                            onChange={(e) => setNewMerchant({ ...newMerchant, category: e.target.value })}
                                            className="w-full bg-surface-soft border border-gray-100 p-5 rounded-[24px] font-black uppercase text-xs outline-none"
                                        >
                                            {['Mista', 'Padaria', 'Refeição', 'Veggie', 'Lanches', 'Hortifruti', 'Supermercado'].map(c => (
                                                <option key={c} value={c}>{c.toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Endereço Completo</label>
                                    <input
                                        type="text"
                                        placeholder="Rua, Número, Bairro - Recife, PE"
                                        value={newMerchant.address}
                                        onChange={(e) => setNewMerchant({ ...newMerchant, address: e.target.value })}
                                        className="w-full bg-surface-soft border border-gray-100 p-5 rounded-[24px] font-bold text-xs outline-none focus:ring-4 ring-secondary/10"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Telefone de Contato</label>
                                        <input
                                            type="text"
                                            placeholder="(81) 9...."
                                            value={newMerchant.phone}
                                            onChange={(e) => setNewMerchant({ ...newMerchant, phone: e.target.value })}
                                            className="w-full bg-surface-soft border border-gray-100 p-5 rounded-[24px] font-bold text-xs outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Descrição Breve</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: Produtos de alta qualidade ao final do dia."
                                            value={newMerchant.description}
                                            onChange={(e) => setNewMerchant({ ...newMerchant, description: e.target.value })}
                                            className="w-full bg-surface-soft border border-gray-100 p-5 rounded-[24px] font-bold text-xs outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 border-t border-gray-100 bg-surface-soft/30 flex justify-end gap-4">
                                <button
                                    onClick={() => setIsAddingMerchant(false)}
                                    className="px-8 py-5 text-[10px] font-black uppercase text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    Descartar
                                </button>
                                <button
                                    onClick={handleCreateMerchant}
                                    disabled={actionLoading}
                                    className="bg-secondary text-white px-10 py-5 rounded-[24px] font-black text-xs uppercase shadow-xl shadow-secondary/20 hover:-translate-y-1 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                                    Finalizar Cadastro
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Premium Notifications Overlay */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="fixed inset-0 z-[500] flex items-center justify-center p-6 pointer-events-none"
                    >
                        <div className={`bg-white p-10 rounded-[48px] shadow-2xl flex flex-col items-center text-center space-y-4 border-2 ${notification.type === 'success' ? 'border-green-400/20' : 'border-red-400/20'}`}>
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${notification.type === 'success' ? 'bg-green-500 shadow-green-200 animate-bounce' : 'bg-red-500 shadow-red-200'}`}>
                                {notification.type === 'success' ? <CheckCircle2 size={40} className="text-white" /> : <XCircle size={40} className="text-white" />}
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
            </AnimatePresence>
        </div>
    )
}

export default SuperAdminPanel
