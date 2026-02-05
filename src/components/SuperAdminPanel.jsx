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
    const [activeTab, setActiveTab] = useState('users') // users, merchants, overview, financial
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
    const [isAddingMerchant, setIsAddingMerchant] = useState(false)
    const [newMerchant, setNewMerchant] = useState({
        name: '',
        category: 'Mista',
        address: '',
        phone: '',
        description: '',
        boost_fee: 2.00
    })
    const [notification, setNotification] = useState(null)
    const [actionLoading, setActionLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchSuperData()
    }, [])

    const showNotify = (type, message, subMessage) => {
        setNotification({ type, message, subMessage })
        setTimeout(() => setNotification(null), 3000)
    }

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
            setStats(prev => ({
                ...prev,
                totalUsers: profiles?.length || 0,
                totalMerchants: establishments?.length || 0,
                totalOrders: orders?.length || 0,
                volumeTotal: totalVol,
                commission: totalVol * 0.15,
                boostRevenue: totalBoost
            }))
        } catch (error) {
            console.error('Erro ao buscar dados:', error)
        } finally {
            setLoading(false)
        }
    }

    const toggleUserRole = async (userId, currentRole) => {
        if (userId === userData.id) {
            showNotify('error', 'PROIBIDO', 'Você não pode alterar seu próprio nível de acesso.')
            return
        }
        const newRole = currentRole === 'customer' ? 'merchant' : 'customer'
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId)

            if (error) throw error
            showNotify('success', 'CARGO ATUALIZADO', `Usuário agora é ${newRole === 'merchant' ? 'LOJISTA' : 'CLIENTE'}`)
            fetchSuperData()
        } catch (error) {
            showNotify('error', 'FALHA NA ATUALIZAÇÃO', error.message)
        }
    }

    const togglePromotion = async (merchantId, currentStatus) => {
        try {
            const { error } = await supabase
                .from('establishments')
                .update({ is_promoted: !currentStatus })
                .eq('id', merchantId)

            if (error) throw error
            showNotify('success', !currentStatus ? 'LOJA IMPULSIONADA' : 'STATUS REMOVIDO', 'Destaque atualizado com sucesso.')
            fetchSuperData()
        } catch (error) {
            showNotify('error', 'FALHA NO IMPULSO', error.message)
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
            setNewMerchant({ name: '', category: 'Mista', address: '', phone: '', description: '', boost_fee: 2.00 })
            fetchSuperData()
        } catch (error) {
            showNotify('error', 'FALHA NO CADASTRO', error.message)
        } finally {
            setActionLoading(false)
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

    const handleDeleteMerchant = async (merchantId) => {
        if (!confirm('Deseja excluir permanentemente este estabelecimento? Todas as sacolas vinculadas também serão removidas.')) return
        try {
            const { error } = await supabase.from('establishments').delete().eq('id', merchantId)
            if (error) throw error
            showNotify('success', 'ESTABELECIMENTO REMOVIDO', 'Os dados foram apagados com sucesso.')
            fetchSuperData()
        } catch (error) {
            showNotify('error', 'ERRO AO EXCLUIR', error.message)
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
            <header className="bg-white p-6 md:p-8 sticky top-0 z-40 border-b border-gray-100 shadow-sm">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-5">
                        <div className="bg-secondary p-4 rounded-[24px] shadow-lg shadow-secondary/20 rotate-3">
                            <ShieldCheck className="text-white w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black italic uppercase tracking-tight text-gray-900 leading-none">Control Center</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-[9px] md:text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Master Admin Access • v1.0.7</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex flex-col items-end mr-4">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Operador</span>
                            <span className="text-sm font-black text-gray-900 italic uppercase">{userData?.full_name}</span>
                        </div>
                        <button onClick={onLogout} className="bg-surface-soft p-4 rounded-[22px] text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-90">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full p-4 md:p-6 space-y-6 md:space-y-10">

                {/* Global Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    <div className="bg-white p-5 md:p-7 rounded-[32px] md:rounded-[40px] shadow-sm border border-gray-100 relative overflow-hidden group">
                        <Users className="absolute -right-4 -top-4 w-20 md:w-24 h-20 md:h-24 text-gray-50 group-hover:scale-110 transition-transform" />
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400">Usuários</p>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 mt-1">{stats.totalUsers}</h2>
                    </div>
                    <div className="bg-white p-5 md:p-7 rounded-[32px] md:rounded-[40px] shadow-sm border border-gray-100 relative overflow-hidden group">
                        <Store className="absolute -right-4 -top-4 w-20 md:w-24 h-20 md:h-24 text-gray-50 group-hover:scale-110 transition-transform" />
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400">Lojistas</p>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 mt-1">{stats.totalMerchants}</h2>
                    </div>
                    <div className="bg-secondary p-5 md:p-7 rounded-[32px] md:rounded-[40px] shadow-xl shadow-secondary/20 text-white relative overflow-hidden group">
                        <DollarSign className="absolute -right-4 -top-4 w-20 md:w-24 h-20 md:h-24 opacity-10 group-hover:scale-110 transition-transform" />
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-70 italic">Volume Global</p>
                        <h2 className="text-xl md:text-2xl font-black mt-1">R$ {stats.volumeTotal.toFixed(2)}</h2>
                    </div>
                    <div className="bg-primary p-5 md:p-7 rounded-[32px] md:rounded-[40px] shadow-xl shadow-primary/20 text-white relative overflow-hidden group">
                        <TrendingUp className="absolute -right-4 -top-4 w-20 md:w-24 h-20 md:h-24 opacity-10 group-hover:scale-110 transition-transform" />
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-70 italic">Receita (Est.)</p>
                        <h2 className="text-xl md:text-2xl font-black mt-1">R$ {stats.commission.toFixed(2)}</h2>
                    </div>
                </div>

                {/* Main Content Sections */}
                <div className="bg-white rounded-[40px] md:rounded-[50px] shadow-sm border border-gray-100 overflow-hidden min-h-[600px]">
                    <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-none bg-gray-50/30 relative">
                        {[
                            { id: 'users', label: 'Gestão de Lojistas', icon: <Users size={16} /> },
                            { id: 'merchants', label: 'Estabelecimentos', icon: <Store size={16} /> },
                            { id: 'overview', label: 'Estatísticas', icon: <BarChart size={16} /> },
                            { id: 'financial', label: 'Financeiro', icon: <DollarSign size={16} /> }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-5 md:py-6 text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 border-b-4 ${activeTab === tab.id
                                    ? 'text-secondary bg-white border-secondary shadow-[0_-4px_10px_rgba(0,0,0,0.05)]'
                                    : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-100/50'
                                    }`}
                            >
                                {tab.icon}
                                <span className="mr-2">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="p-4 md:p-8">
                        {/* 1. USERS MANAGEMENT (MOBILE FIRST REFORM) */}
                        {activeTab === 'users' && (
                            <div className="animate-in slide-in-from-right-4 duration-500 space-y-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Buscar usuário..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-surface-soft border-2 border-transparent focus:border-secondary/10 p-4 pl-12 rounded-2xl font-bold text-sm outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase self-start md:self-auto">
                                        <Users size={14} /> {users.length} Registrados
                                    </div>
                                </div>

                                {/* Layout Responsive: Cards on Mobile, Table on Desktop */}
                                <div className="grid grid-cols-1 md:hidden gap-4">
                                    {users.filter(u =>
                                        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        u.id.includes(searchQuery)
                                    ).map(u => (
                                        <div key={u.id} className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-surface-soft flex items-center justify-center font-black text-gray-400 text-lg uppercase shadow-inner">
                                                    {u.full_name?.charAt(0) || 'U'}
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <p className="text-sm font-black uppercase text-gray-900 leading-none truncate">{u.full_name || 'Sem Nome'}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">ID: {u.id.slice(0, 8)}</p>
                                                    <div className="mt-2 text-[8px]">
                                                        <span className={`px-3 py-1 rounded-full font-black uppercase tracking-widest ${u.role === 'superadmin' ? 'bg-purple-100 text-purple-600' : u.role === 'merchant' ? 'bg-secondary/10 text-secondary' : 'bg-green-100 text-green-600'}`}>
                                                            {u.role === 'superadmin' ? 'SUPER ADMIN' : u.role === 'merchant' ? 'LOJISTA' : 'CLIENTE'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-surface-soft p-4 rounded-2xl space-y-3">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Acesso do Lojista:</p>
                                                <div className="flex flex-col gap-2">
                                                    <select
                                                        className="w-full bg-white border-2 border-transparent focus:border-secondary/20 text-[11px] font-bold p-3 rounded-xl outline-none shadow-sm"
                                                        onChange={(e) => linkMerchantToStore(u.id, e.target.value)}
                                                        defaultValue={u.establishment_id || ''}
                                                    >
                                                        <option value="">VINCULAR AO ESTABELECIMENTO...</option>
                                                        {merchants.map(m => (
                                                            <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>
                                                        ))}
                                                    </select>
                                                    {u.establishment_id && (
                                                        <button
                                                            onClick={() => linkMerchantToStore(u.id, null)}
                                                            className="w-full py-3 bg-red-50 text-red-500 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2"
                                                        >
                                                            <XCircle size={14} /> REMOVER VÍNCULO BASE
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => toggleUserRole(u.id, u.role)}
                                                    className="flex-1 bg-gray-50 text-gray-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-secondary/10 hover:text-secondary transition-all"
                                                >
                                                    Inverter Cargo
                                                </button>
                                                <button className="p-3 bg-blue-50 text-blue-500 rounded-xl">
                                                    <Mail size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="hidden md:block bg-surface-soft rounded-[30px] overflow-hidden border border-gray-100 shadow-inner">
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

                        {/* 2. MERCHANTS MANAGEMENT */}
                        {activeTab === 'merchants' && (
                            <div className="animate-in slide-in-from-right-4 duration-500 space-y-6">
                                <div className="flex items-center justify-between gap-4">
                                    <h3 className="text-sm font-black uppercase italic text-gray-800">Parceiros Ativos</h3>
                                    <button
                                        onClick={() => setIsAddingMerchant(true)}
                                        className="bg-secondary text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-secondary/10 flex items-center gap-2 hover:-translate-y-1 active:scale-95 transition-all"
                                    >
                                        <Plus size={16} /> Novo Estabelecimento
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {merchants.filter(m =>
                                        m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        m.category?.toLowerCase().includes(searchQuery.toLowerCase())
                                    ).map(m => (
                                        <div key={m.id} className="bg-surface-soft p-6 rounded-[40px] border border-gray-100 hover:border-secondary/20 transition-all group">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                                                    <Building2 className="text-secondary" size={20} />
                                                </div>
                                                <div className="px-3 py-1 bg-white rounded-full border border-gray-100">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase">{m.category}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-black uppercase text-gray-900 group-hover:text-secondary transition-colors">{m.name}</h4>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                                                    <MapPin size={10} /> {m.address ? m.address.slice(0, 30) + '...' : 'Endereço não informado'}
                                                </p>
                                            </div>

                                            <div className="flex gap-2 mt-6">
                                                <button
                                                    onClick={() => togglePromotion(m.id, m.is_promoted)}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${m.is_promoted ? 'bg-yellow-100 text-yellow-600 shadow-inner' : 'bg-surface-soft text-gray-500 hover:bg-yellow-50 hover:text-yellow-600'}`}
                                                >
                                                    <Zap size={14} fill={m.is_promoted ? "currentColor" : "none"} />
                                                    {m.is_promoted ? 'Promovido' : 'Impulsionar'}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteMerchant(m.id)}
                                                    className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                                >
                                                    <Trash2 size={16} />
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

                        {/* 3. OVERVIEW / STATS */}
                        {activeTab === 'overview' && (
                            <div className="animate-in fade-in duration-500 space-y-8">
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="bg-surface-soft p-8 rounded-[40px] border border-gray-100 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-black uppercase italic text-gray-800">Crescimento de Usuários</h3>
                                            <BarChart className="text-gray-300" size={20} />
                                        </div>
                                        <div className="h-40 flex items-end justify-between gap-2 px-4">
                                            {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                                                <div key={i} className="flex-1 bg-secondary/10 rounded-t-xl relative group">
                                                    <motion.div
                                                        initial={{ height: 0 }}
                                                        animate={{ height: `${h}%` }}
                                                        className="absolute bottom-0 left-0 right-0 bg-secondary rounded-t-xl group-hover:bg-primary transition-colors"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between text-[8px] font-black text-gray-400 uppercase px-2">
                                            <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sab</span><span>Dom</span>
                                        </div>
                                    </div>

                                    <div className="bg-surface-soft p-8 rounded-[40px] border border-gray-100 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-black uppercase italic text-gray-800">Distribuição por Categoria</h3>
                                            <PieChart className="text-gray-300" size={20} />
                                        </div>
                                        <div className="space-y-4">
                                            {['Padaria', 'Refeição', 'Hortifruti'].map((cat, i) => (
                                                <div key={cat} className="space-y-1">
                                                    <div className="flex justify-between text-[10px] font-black uppercase">
                                                        <span>{cat}</span>
                                                        <span className="text-secondary">{[45, 30, 25][i]}%</span>
                                                    </div>
                                                    <div className="h-2 bg-white rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${[45, 30, 25][i]}%` }}
                                                            className={`h-full ${i === 0 ? 'bg-secondary' : i === 1 ? 'bg-primary' : 'bg-yellow-400'}`}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. FINANCIAL (REFORMED FOR MOBILE) */}
                        {activeTab === 'financial' && (
                            <div className="animate-in slide-in-from-right-4 duration-500 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-secondary p-8 md:p-10 rounded-[40px] md:rounded-[48px] text-white space-y-6 relative overflow-hidden shadow-xl shadow-secondary/20">
                                        <TrendingUp className="absolute right-[-10px] bottom-[-10px] w-48 h-48 opacity-10" />
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1">
                                                <h4 className="text-[9px] font-black uppercase tracking-widest opacity-80">Comissões (15%)</h4>
                                                <h2 className="text-2xl md:text-3xl font-black italic">R$ {stats.commission.toFixed(2)}</h2>
                                            </div>
                                            <div className="flex flex-col gap-1 text-right">
                                                <h4 className="text-[9px] font-black uppercase tracking-widest opacity-80">Taxas de Impulso</h4>
                                                <h2 className="text-2xl md:text-3xl font-black italic">R$ {stats.boostRevenue.toFixed(2)}</h2>
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                                            <div>
                                                <p className="text-[9px] font-bold uppercase opacity-60 tracking-wider">Total Acumulado:</p>
                                                <p className="text-3xl font-black italic">R$ {(stats.commission + stats.boostRevenue).toFixed(2)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-bold uppercase opacity-60 tracking-wider">Volume de Vendas:</p>
                                                <p className="text-sm font-black italic">R$ {stats.volumeTotal.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 md:p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-black uppercase italic text-gray-800 flex items-center gap-2">
                                                <Star className="text-secondary" size={16} /> Melhores Lojistas
                                            </h3>
                                        </div>
                                        <div className="space-y-3">
                                            {merchants.slice(0, 3).map((m, i) => (
                                                <div key={m.id} className="bg-surface-soft px-5 py-4 rounded-2xl flex items-center justify-between group hover:bg-secondary/5 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="bg-white w-10 h-10 rounded-xl shadow-sm flex items-center justify-center font-black text-secondary italic text-xs">
                                                            #{i + 1}
                                                        </div>
                                                        <p className="text-[11px] font-black uppercase text-gray-700">{m.name}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[8px] font-bold text-gray-400 uppercase leading-none truncate">Status</p>
                                                        <p className="text-[10px] font-black text-secondary uppercase mt-0.5">Ativo</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-orange-50 p-6 md:p-8 rounded-[40px] border border-orange-100 flex flex-col md:flex-row items-center gap-6">
                                    <div className="bg-orange-500 p-4 rounded-3xl text-white shadow-lg shadow-orange-200">
                                        <PieChart size={24} />
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h4 className="text-xs font-black uppercase italic text-orange-600">Modelo de Negócio Ativo</h4>
                                        <p className="text-[11px] font-bold text-orange-900/60 uppercase mt-1 leading-relaxed">
                                            A plataforma retém 15% de cada transação. O fechamento é quinzenal.
                                        </p>
                                    </div>
                                    <button className="w-full md:w-auto bg-white text-orange-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-sm border border-orange-100 active:scale-95 transition-all">
                                        Simular Repasses
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
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="bg-white w-full max-w-2xl rounded-[40px] md:rounded-[50px] shadow-2xl overflow-hidden flex flex-col"
                        >
                            <div className="p-8 md:p-10 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-secondary/10 p-3 rounded-2xl">
                                        <Store className="text-secondary" />
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-black italic uppercase">Novo Lojista</h3>
                                </div>
                                <button onClick={() => setIsAddingMerchant(false)} className="bg-surface-soft p-3 rounded-2xl text-gray-400">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="p-8 md:p-10 overflow-y-auto max-h-[70vh] space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Estabelecimento</label>
                                        <input
                                            type="text"
                                            placeholder="Nome fantasia"
                                            value={newMerchant.name}
                                            onChange={(e) => setNewMerchant({ ...newMerchant, name: e.target.value })}
                                            className="w-full bg-surface-soft border border-gray-100 p-5 rounded-[24px] font-black uppercase text-xs outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Categoria</label>
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Endereço</label>
                                        <input
                                            type="text"
                                            placeholder="Rua, Número - Bairro"
                                            value={newMerchant.address}
                                            onChange={(e) => setNewMerchant({ ...newMerchant, address: e.target.value })}
                                            className="w-full bg-surface-soft border border-gray-100 p-5 rounded-[24px] font-bold text-xs outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Taxa de Impulso (R$)</label>
                                        <input
                                            type="number"
                                            step="0.50"
                                            placeholder="Ex: 2,00"
                                            value={newMerchant.boost_fee}
                                            onChange={(e) => setNewMerchant({ ...newMerchant, boost_fee: parseFloat(e.target.value) })}
                                            className="w-full bg-surface-soft border border-gray-100 p-5 rounded-[24px] font-black text-xs outline-none text-secondary"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 md:p-10 border-t border-gray-100 bg-surface-soft/30 flex justify-end gap-4">
                                <button
                                    onClick={() => setIsAddingMerchant(false)}
                                    className="px-6 py-4 text-[10px] font-black uppercase text-gray-400"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreateMerchant}
                                    disabled={actionLoading}
                                    className="bg-secondary text-white px-8 md:px-10 py-4 md:py-5 rounded-[24px] font-black text-xs uppercase shadow-xl shadow-secondary/20 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                                    Finalizar
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
                        <div className={`bg-white p-8 md:p-10 rounded-[48px] shadow-2xl flex flex-col items-center text-center space-y-4 border-2 ${notification.type === 'success' ? 'border-green-400/20' : 'border-red-400/20'}`}>
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${notification.type === 'success' ? 'bg-green-500 shadow-green-200 animate-bounce' : 'bg-red-500 shadow-red-200'}`}>
                                {notification.type === 'success' ? <CheckCircle2 size={40} className="text-white" /> : <XCircle size={40} className="text-white" />}
                            </div>
                            <div>
                                <h2 className="text-xl md:text-2xl font-black italic uppercase text-gray-900 leading-none">{notification.message}</h2>
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
