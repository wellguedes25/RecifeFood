import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ShieldCheck, Users, Store, TrendingUp, Settings, LogOut,
    Mail, Phone, MapPin, ArrowRight, Star, BarChart, PieChart,
    ChevronRight, UserPlus, Filter, Zap, LayoutDashboard, DollarSign,
    CheckCircle2, XCircle, Search, Trash2, Power, Smartphone, Loader2,
    Building2, Plus, LogIn, AlertTriangle, Edit2
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
    const [isAddingMerchant, setIsAddingMerchant] = useState(false)
    const [newMerchant, setNewMerchant] = useState({
        name: '',
        category: 'Mista',
        address: '',
        phone: '',
        description: '',
        pagseguro_account: '',
        boost_fee: 2.00
    })
    const [notification, setNotification] = useState(null)
    const [actionLoading, setActionLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [confirmingDelete, setConfirmingDelete] = useState(null)
    const [confirmingDeleteUser, setConfirmingDeleteUser] = useState(null)
    const [editingMerchantId, setEditingMerchantId] = useState(null)

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

    const toggleUserRole = async (userId, currentRole) => {
        if (userId === userData.id) {
            showNotify('error', 'AÇÃO NEGADA', 'Você não pode alterar seu próprio cargo.')
            return
        }
        const newRole = currentRole === 'customer' ? 'merchant' : 'customer'
        try {
            const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
            if (error) throw error
            showNotify('success', 'CARGO ATUALIZADO', `Usuário agora é ${newRole === 'merchant' ? 'LOJISTA' : 'CLIENTE'} `)
            fetchSuperData()
        } catch (error) {
            showNotify('error', 'ERRO', error.message)
        }
    }

    const togglePromotion = async (merchantId, currentStatus) => {
        try {
            const { error } = await supabase.from('establishments').update({ is_promoted: !currentStatus }).eq('id', merchantId)
            if (error) throw error
            showNotify('success', !currentStatus ? 'LOJA IMPULSIONADA' : 'RESTAURADO', 'Status atualizado.')
            fetchSuperData()
        } catch (error) {
            showNotify('error', 'ERRO', error.message)
        }
    }

    const handleCreateMerchant = async () => {
        if (!newMerchant.name || !newMerchant.address) return
        setActionLoading(true)
        try {
            if (editingMerchantId) {
                const { error } = await supabase
                    .from('establishments')
                    .update(newMerchant)
                    .eq('id', editingMerchantId)
                if (error) throw error
                showNotify('success', 'SUCESSO', 'Estabelecimento atualizado.')
            } else {
                const { error } = await supabase.from('establishments').insert([newMerchant])
                if (error) throw error
                showNotify('success', 'SUCESSO', 'Estabelecimento cadastrado.')
            }

            setIsAddingMerchant(false)
            setEditingMerchantId(null)
            setNewMerchant({ name: '', category: 'Mista', address: '', phone: '', description: '', pagseguro_account: '', boost_fee: 2.00 })
            fetchSuperData()
        } catch (error) {
            showNotify('error', 'ERRO', error.message)
        } finally {
            setActionLoading(false)
        }
    }

    const openEditModal = (m) => {
        setNewMerchant({
            name: m.name || '',
            category: m.category || 'Mista',
            address: m.address || '',
            phone: m.phone || '',
            description: m.description || '',
            pagseguro_account: m.pagseguro_account || '',
            boost_fee: m.boost_fee || 2.00
        })
        setEditingMerchantId(m.id)
        setIsAddingMerchant(true)
    }

    const handleDeleteMerchant = async (merchantId) => {
        setConfirmingDelete(merchantId)
    }

    const executeDeleteMerchant = async () => {
        if (!confirmingDelete) return
        setActionLoading(true)
        try {
            const { error } = await supabase.from('establishments').delete().eq('id', confirmingDelete)
            if (error) throw error
            showNotify('success', 'ESTABELECIMENTO REMOVIDO', 'Os dados foram excluídos do sistema.')
            setConfirmingDelete(null)
            fetchSuperData()
        } catch (error) {
            showNotify('error', 'ERRO AO EXCLUIR', error.message)
        } finally {
            setActionLoading(false)
        }
    }

    const executeDeleteUser = async () => {
        if (!confirmingDeleteUser) return
        if (confirmingDeleteUser === userData.id) {
            showNotify('error', 'PROIBIDO', 'Você não pode excluir sua própria conta.')
            setConfirmingDeleteUser(null)
            return
        }
        setActionLoading(true)
        try {
            const { error } = await supabase.from('profiles').delete().eq('id', confirmingDeleteUser)
            if (error) throw error
            showNotify('success', 'USUÁRIO REMOVIDO', 'O perfil e dados do usuário foram apagados.')
            setConfirmingDeleteUser(null)
            fetchSuperData()
        } catch (error) {
            showNotify('error', 'ERRO AO EXCLUIR', error.message)
        } finally {
            setActionLoading(false)
        }
    }

    const linkMerchantToStore = async (userId, storeId) => {
        try {
            const { error } = await supabase.from('profiles').update({ establishment_id: storeId, role: storeId ? 'merchant' : 'customer' }).eq('id', userId)
            if (error) throw error
            showNotify('success', 'VÍNCULO ATUALIZADO', storeId ? 'Lojista vinculado.' : 'Vínculo removido.')
            fetchSuperData()
        } catch (error) {
            showNotify('error', 'ERRO', error.message)
        }
    }

    if (loading || !userData) {
        return (
            <div className="min-h-screen bg-surface-soft flex flex-col items-center justify-center p-8 space-y-4">
                <Loader2 className="animate-spin text-secondary w-12 h-12" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] animate-pulse">Carregando Painel Web...</p>
            </div>
        )
    }

    const menuItems = [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'users', label: 'Gestão de Lojistas', icon: Users },
        { id: 'merchants', label: 'Estabelecimentos', icon: Store },
        { id: 'financial', label: 'Financeiro', icon: DollarSign },
        { id: 'settings', label: 'Configurações', icon: Settings },
    ]

    const filteredUsers = users.filter(u =>
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.id.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredMerchants = merchants.filter(m =>
        m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category?.toLowerCase().includes(searchQuery.toLowerCase())
    )

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
                            className={`w - full flex items - center gap - 4 px - 6 py - 4 rounded - 2xl font - black text - sm uppercase tracking - tight transition - all ${activeTab === item.id
                                ? 'bg-secondary text-white shadow-xl shadow-secondary/20'
                                : 'text-gray-400 hover:bg-surface-soft hover:text-gray-900'
                                } `}
                        >
                            <item.icon size={20} />
                            {item.label}
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
                        className="w-full flex items-center justify-center gap-2 py-4 text-[10px] font-black text-red-100 bg-red-500 rounded-2xl hover:bg-red-600 uppercase tracking-widest transition-all shadow-lg shadow-red-200"
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
                            <p className="text-gray-400 font-bold uppercase text-xs tracking-[0.2em] mt-2">Painel de Controle v1.1.0 • Gestão Completa</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 flex items-center gap-3 shadow-sm focus-within:border-secondary transition-all">
                                <Search className="text-gray-300" size={18} />
                                <input
                                    type="text"
                                    placeholder="Pesquisar..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="outline-none text-sm font-bold text-gray-700 w-48"
                                />
                            </div>
                            {activeTab === 'merchants' && (
                                <button
                                    onClick={() => setIsAddingMerchant(true)}
                                    className="bg-primary text-white px-8 py-3 rounded-2xl font-black text-sm uppercase shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <Plus size={18} />
                                    Novo Estabelecimento
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Dashboard Cards Grid */}
                    {activeTab === 'overview' && (
                        <div className="space-y-10">
                            <div className="grid grid-cols-4 gap-8">
                                {[
                                    { label: 'Total de Vendas', value: stats.totalOrders, icon: TrendingUp, color: 'bg-green-500' },
                                    { label: 'Volume (GMV)', value: `R$ ${stats.volumeTotal.toFixed(2)} `, icon: DollarSign, color: 'bg-blue-500' },
                                    { label: 'Comissões', value: `R$ ${stats.commission.toFixed(2)} `, icon: PieChart, color: 'bg-secondary' },
                                    { label: 'Taxas Adicionais', value: `R$ ${stats.boostRevenue.toFixed(2)} `, icon: Zap, color: 'bg-orange-500' },
                                ].map((card, i) => (
                                    <div key={i} className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-50 space-y-4">
                                        <div className={`${card.color} w - 12 h - 12 rounded - 2xl flex items - center justify - center text - white shadow - lg`}>
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
                                        {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                                            <div key={i} className="w-12 bg-secondary/10 rounded-t-xl relative group">
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${h}% ` }}
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

                    {/* Table View for Users/Lojistas */}
                    {activeTab === 'users' && (
                        <div className="bg-white rounded-[48px] overflow-hidden border border-gray-50 shadow-sm transition-all">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Usuário</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cargo</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Vinculado à Loja</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Controle</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-gray-50/20 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-surface-soft rounded-2xl flex items-center justify-center font-black text-gray-900 uppercase">
                                                        {u.full_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900 uppercase italic">{u.full_name}</p>
                                                        <p className="text-[10px] font-bold text-gray-400">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <button
                                                    onClick={() => toggleUserRole(u.id, u.role)}
                                                    className={`px - 4 py - 1.5 rounded - full text - [10px] font - black uppercase tracking - widest border transition - all ${u.role === 'merchant'
                                                        ? 'bg-secondary/5 text-secondary border-secondary/10 hover:bg-secondary hover:text-white'
                                                        : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-500 hover:text-white'
                                                        } `}
                                                >
                                                    {u.role === 'merchant' ? 'LOJISTA' : 'CLIENTE'}
                                                </button>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        className="bg-white border border-gray-100 text-[10px] font-black p-3 rounded-xl outline-none focus:border-secondary transition-all"
                                                        value={u.establishment_id || ''}
                                                        onChange={(e) => linkMerchantToStore(u.id, e.target.value)}
                                                    >
                                                        <option value="">NÃO VINCULADO</option>
                                                        {merchants.map(m => (
                                                            <option key={m.id} value={m.id}>{m.name?.toUpperCase() || 'SEM NOME'}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button className="p-3 bg-surface-soft text-gray-400 rounded-xl hover:text-secondary hover:bg-white border border-transparent hover:border-secondary/20 shadow-sm transition-all">
                                                        <Settings size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmingDeleteUser(u.id)}
                                                        className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                    >
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

                    {/* Table View for Merchants */}
                    {activeTab === 'merchants' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredMerchants.map((m) => (
                                <div key={m.id} className="bg-white rounded-[48px] p-10 border border-gray-100 shadow-sm hover:border-secondary/20 hover:shadow-xl transition-all group">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="bg-surface-soft p-4 rounded-3xl group-hover:bg-secondary/10 transition-colors">
                                            <Building2 className="text-secondary" size={24} />
                                        </div>
                                        <div className="px-4 py-1.5 bg-gray-50 rounded-full border border-gray-100">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{m.category}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-black text-gray-900 uppercase italic">{m.name}</h3>
                                        <p className="text-xs font-bold text-gray-400 flex items-center gap-2">
                                            <MapPin size={12} /> {m.address}
                                        </p>
                                    </div>
                                    <div className="mt-10 flex gap-4">
                                        <button
                                            onClick={() => togglePromotion(m.id, m.is_promoted)}
                                            className={`flex - 1 flex items - center justify - center gap - 2 py - 4 rounded - 2xl font - black text - [10px] uppercase tracking - widest transition - all ${m.is_promoted
                                                ? 'bg-yellow-100 text-yellow-600'
                                                : 'bg-surface-soft text-gray-400 hover:bg-yellow-50 hover:text-yellow-600'
                                                } `}
                                        >
                                            <Zap size={14} fill={m.is_promoted ? "currentColor" : "none"} />
                                            {m.is_promoted ? 'Promovido' : 'Impulsionar'}
                                        </button>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openEditModal(m)}
                                                className="p-4 bg-secondary/10 text-secondary rounded-2xl hover:bg-secondary hover:text-white transition-all shadow-sm"
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteMerchant(m.id)}
                                                className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Financial Tab Content */}
                    {activeTab === 'financial' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="grid grid-cols-3 gap-8">
                                <div className="bg-secondary p-10 rounded-[48px] text-white space-y-4 shadow-2xl shadow-secondary/20 relative overflow-hidden">
                                    <TrendingUp className="absolute right-[-20%] bottom-[-20%] w-64 h-64 opacity-10" />
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-80">Receita de Comissões (15%)</h4>
                                    <h2 className="text-4xl font-black italic">R$ {stats.commission.toFixed(2)}</h2>
                                    <p className="text-[10px] font-bold opacity-60 uppercase">Calculado sobre o volume total de vendas finalizadas.</p>
                                </div>
                                <div className="bg-white p-10 rounded-[48px] border border-gray-100 space-y-4 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-orange-50 p-2 rounded-xl">
                                            <Zap className="text-orange-500" size={20} />
                                        </div>
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Receita de Impulsos</h4>
                                    </div>
                                    <h2 className="text-4xl font-black italic text-gray-900">R$ {stats.boostRevenue.toFixed(2)}</h2>
                                    <p className="text-[10px] font-bold text-gray-300 uppercase">Total arrecadado com taxas de destaque de lojas.</p>
                                </div>
                                <div className="bg-white p-10 rounded-[48px] border border-gray-100 space-y-4 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-50 p-2 rounded-xl">
                                            <BarChart className="text-blue-500" size={20} />
                                        </div>
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Total Plataforma</h4>
                                    </div>
                                    <h2 className="text-4xl font-black italic text-gray-900">R$ {(stats.commission + stats.boostRevenue).toFixed(2)}</h2>
                                    <p className="text-[10px] font-bold text-gray-300 uppercase">Lucro bruto acumulado (Comissões + Taxas).</p>
                                </div>
                            </div>

                            <section className="bg-white rounded-[48px] border border-gray-50 shadow-sm overflow-hidden">
                                <div className="p-10 border-b border-gray-50 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-black italic uppercase text-gray-900">Relatório de Repasse</h3>
                                        <p className="text-xs font-bold text-gray-400 uppercase mt-1">Valores a serem transferidos para os parceiros</p>
                                    </div>
                                    <button className="bg-surface-soft text-gray-900 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all">
                                        Exportar PDF
                                    </button>
                                </div>

                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Parceiro</th>
                                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Vendas Brutas</th>
                                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Comissão (15%)</th>
                                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Taxas de Impulso</th>
                                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Valor Líquido (Repasse)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {merchants.map(m => {
                                            const mOrders = 1250.00 // Demo value logic could be expanded
                                            const mCommission = mOrders * 0.15
                                            const mBoosts = 15.00
                                            return (
                                                <tr key={m.id} className="hover:bg-gray-50/20 transition-colors">
                                                    <td className="px-10 py-6">
                                                        <p className="text-sm font-black text-gray-900 uppercase italic leading-none">{m.name}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">CNPJ: 00.000.000/0001-00</p>
                                                    </td>
                                                    <td className="px-10 py-6 text-right font-black text-sm">R$ {mOrders.toFixed(2)}</td>
                                                    <td className="px-10 py-6 text-right font-black text-sm text-red-500">- R$ {mCommission.toFixed(2)}</td>
                                                    <td className="px-10 py-6 text-right font-black text-sm text-red-500">- R$ {mBoosts.toFixed(2)}</td>
                                                    <td className="px-10 py-6 text-right font-black text-lg text-secondary">R$ {(mOrders - mCommission - mBoosts).toFixed(2)}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </section>
                        </div>
                    )}
                </div>
            </main>

            {/* Modals & Notifications */}
            <AnimatePresence>
                {isAddingMerchant && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-8">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden"
                        >
                            <div className="p-10 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-secondary/10 p-3 rounded-2xl">
                                        <Store className="text-secondary" />
                                    </div>
                                    <h3 className="text-2xl font-black italic uppercase">{editingMerchantId ? 'Editar Estabelecimento' : 'Novo Estabelecimento'}</h3>
                                </div>
                                <button onClick={() => {
                                    setIsAddingMerchant(false)
                                    setEditingMerchantId(null)
                                    setNewMerchant({ name: '', category: 'Mista', address: '', phone: '', description: '', pagseguro_account: '', boost_fee: 2.00 })
                                }} className="text-gray-300 hover:text-gray-900 transition-colors">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="p-10 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Nome Comercial</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Padaria do Recife"
                                        value={newMerchant.name}
                                        onChange={(e) => setNewMerchant({ ...newMerchant, name: e.target.value })}
                                        className="w-full bg-surface-soft border border-gray-50 p-5 rounded-2xl font-black text-sm outline-none focus:border-secondary transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Endereço Completo</label>
                                    <input
                                        type="text"
                                        placeholder="Rua, Número, Bairro"
                                        value={newMerchant.address}
                                        onChange={(e) => setNewMerchant({ ...newMerchant, address: e.target.value })}
                                        className="w-full bg-surface-soft border border-gray-50 p-5 rounded-2xl font-black text-sm outline-none focus:border-secondary transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Categoria</label>
                                        <select
                                            value={newMerchant.category}
                                            onChange={(e) => setNewMerchant({ ...newMerchant, category: e.target.value })}
                                            className="w-full bg-surface-soft border border-gray-50 p-5 rounded-2xl font-black text-xs uppercase outline-none focus:border-secondary transition-all"
                                        >
                                            <option>Mista</option>
                                            <option>Padaria</option>
                                            <option>Hortifruti</option>
                                            <option>Restaurante</option>
                                            <option>Confeitaria</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Taxa de Impulso (R$)</label>
                                        <input
                                            type="number"
                                            step="0.50"
                                            value={newMerchant.boost_fee}
                                            onChange={(e) => setNewMerchant({ ...newMerchant, boost_fee: parseFloat(e.target.value) })}
                                            className="w-full bg-surface-soft border border-gray-50 p-5 rounded-2xl font-black text-sm outline-none focus:border-secondary transition-all text-secondary"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-secondary uppercase tracking-widest px-2 italic">E-mail PagBank (Split de 15%)</label>
                                    <input
                                        type="email"
                                        placeholder="Ex: financeiro@loja.com.br"
                                        value={newMerchant.pagseguro_account}
                                        onChange={(e) => setNewMerchant({ ...newMerchant, pagseguro_account: e.target.value })}
                                        className="w-full bg-secondary/5 border border-secondary/10 p-5 rounded-2xl font-black text-sm outline-none focus:border-secondary transition-all text-secondary"
                                    />
                                </div>
                            </div>

                            <div className="p-10 bg-gray-50/50 flex gap-4">
                                <button
                                    onClick={() => {
                                        setIsAddingMerchant(false)
                                        setEditingMerchantId(null)
                                        setNewMerchant({ name: '', category: 'Mista', address: '', phone: '', description: '', pagseguro_account: '', boost_fee: 2.00 })
                                    }}
                                    className="flex-1 py-5 rounded-2xl font-black text-xs uppercase text-gray-400 hover:bg-gray-100 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreateMerchant}
                                    disabled={actionLoading}
                                    className="flex-1 bg-secondary text-white py-5 rounded-2xl font-black text-xs uppercase shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {actionLoading ? <Loader2 className="animate-spin" /> : (editingMerchantId ? <Settings size={18} /> : <Plus />)}
                                    {editingMerchantId ? 'Salvar Alterações' : 'Finalizar Cadastro'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {notification && (
                    <motion.div initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }} className="fixed bottom-12 right-12 z-[500] pointer-events-none">
                        <div className={`bg-white p-6 rounded-[28px] shadow-2xl border-l-8 flex items-center gap-4 min-w-[300px] ${notification.type === 'success' ? 'border-secondary' : 'border-red-500'}`}>
                            <div className={`p-3 rounded-xl ${notification.type === 'success' ? 'bg-secondary/10 text-secondary' : 'bg-red-50 text-red-500'}`}>
                                {notification.type === 'success' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase text-gray-900">{notification.message}</h4>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{notification.subMessage}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal: Confirmação de Exclusão (Custom) */}
            < AnimatePresence >
                {confirmingDelete && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white w-full max-w-md rounded-[48px] shadow-2xl overflow-hidden p-10 space-y-8"
                        >
                            <div className="bg-red-50 w-24 h-24 rounded-[40px] flex items-center justify-center mx-auto">
                                <AlertTriangle className="text-red-500 w-12 h-12" />
                            </div>

                            <div className="text-center space-y-3">
                                <h3 className="text-2xl font-black italic uppercase text-gray-900 leading-none">Atenção Crítica!</h3>
                                <p className="text-gray-500 text-sm font-bold leading-relaxed px-6">
                                    Deseja mesmo excluir este estabelecimento? Esta ação apagará permanentemente o perfil, produtos e faturamento vinculado.
                                </p>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setConfirmingDelete(null)}
                                    className="flex-1 bg-surface-soft text-gray-400 py-5 rounded-[24px] font-black uppercase text-[11px] tracking-widest hover:bg-gray-100 transition-all"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    onClick={executeDeleteMerchant}
                                    disabled={actionLoading}
                                    className="flex-[1.5] bg-red-500 text-white py-5 rounded-[24px] font-black uppercase text-[11px] tracking-widest shadow-xl shadow-red-200 hover:bg-red-600 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    {actionLoading ? <Loader2 className="animate-spin text-white" size={18} /> : 'SIM, EXCLUIR AGORA'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence >
            {/* Modal: Confirmação de Exclusão de Usuário */}
            < AnimatePresence >
                {confirmingDeleteUser && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white w-full max-w-md rounded-[48px] shadow-2xl overflow-hidden p-10 space-y-8"
                        >
                            <div className="bg-red-50 w-24 h-24 rounded-[40px] flex items-center justify-center mx-auto">
                                <AlertTriangle className="text-red-500 w-12 h-12" />
                            </div>

                            <div className="text-center space-y-3">
                                <h3 className="text-2xl font-black italic uppercase text-gray-900 leading-none">Excluir Perfil?</h3>
                                <p className="text-gray-500 text-sm font-bold leading-relaxed px-6">
                                    Deseja mesmo apagar este usuário? Esta ação removerá permanentemente o perfil, mensagens e avaliações associadas.
                                </p>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setConfirmingDeleteUser(null)}
                                    className="flex-1 bg-surface-soft text-gray-400 py-5 rounded-[24px] font-black uppercase text-[11px] tracking-widest hover:bg-gray-100 transition-all"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    onClick={executeDeleteUser}
                                    disabled={actionLoading}
                                    className="flex-[1.5] bg-red-500 text-white py-5 rounded-[24px] font-black uppercase text-[11px] tracking-widest shadow-xl shadow-red-200 hover:bg-red-600 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    {actionLoading ? <Loader2 className="animate-spin text-white" size={18} /> : 'SIM, EXCLUIR AGORA'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence >
        </div >
    )
}

export default SuperAdminPanelWeb
