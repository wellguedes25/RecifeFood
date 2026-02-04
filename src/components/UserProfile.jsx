import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, User, Mail, CreditCard, Phone, Heart, Award, LogOut, ChevronRight, Save, Loader2, Camera } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

function UserProfile({ userData, stats, favorites, establishments, onBack, onLogout, onUpdate }) {
    const [isEditing, setIsEditing] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        full_name: userData?.full_name || '',
        phone: userData?.phone || ''
    })

    const handleUpdate = async () => {
        setIsLoading(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    phone: formData.phone,
                    updated_at: new Date()
                })
                .eq('id', userData.id)

            if (error) throw error
            onUpdate({ ...userData, ...formData })
            setIsEditing(false)
        } catch (error) {
            alert('Erro ao atualizar perfil: ' + error.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleFileUpload = async (event) => {
        try {
            setIsLoading(true)
            const file = event.target.files[0]
            if (!file) return

            const fileExt = file.name.split('.').pop()
            const fileName = `${userData.id}-${Math.random()}.${fileExt}`
            const filePath = `avatars/${fileName}`

            // 1. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            // 3. Update Profile
            await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', userData.id)

            onUpdate({ ...userData, avatar_url: publicUrl })
        } catch (error) {
            console.error('Erro ao enviar imagem:', error)
            alert('Erro ao enviar imagem. Verifique se o bucket "avatars" existe no seu Supabase.')
        } finally {
            setIsLoading(false)
        }
    }

    const favoriteStores = establishments.filter(s => favorites.includes(s.id))

    return (
        <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="absolute inset-0 bg-white z-[70] flex flex-col"
        >
            {/* Header */}
            <header className="bg-white p-4 flex items-center justify-between border-b border-gray-100">
                <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-primary transition-colors">
                    <ChevronLeft size={28} />
                </button>
                <h2 className="text-lg font-black text-gray-900 italic uppercase">Meu Perfil</h2>
                <div className="w-10"></div>
            </header>

            <main className="flex-1 overflow-y-auto bg-surface-soft scrollbar-none">
                {/* Profile Hero */}
                <div className="bg-white p-8 flex flex-col items-center space-y-4 border-b border-gray-100">
                    <div className="relative">
                        <div className="w-24 h-24 bg-primary/10 rounded-[32px] flex items-center justify-center border-2 border-primary/20 overflow-hidden">
                            {userData?.avatar_url ? (
                                <img src={userData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User size={48} className="text-primary" />
                            )}
                        </div>
                        <label className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl shadow-lg border border-gray-100 text-gray-400 cursor-pointer hover:text-primary transition-colors">
                            <Camera size={16} />
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </label>
                    </div>
                    <div className="text-center">
                        <h3 className="text-xl font-black text-gray-900 tracking-tight leading-tight">
                            {userData?.full_name || 'Herói do Recife'}
                        </h3>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                            Membro desde {userData?.created_at ? new Date(userData.created_at).getFullYear() : new Date().getFullYear()}
                        </p>
                    </div>
                </div>

                {/* Impact Stats */}
                <div className="p-6 grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-1">
                        <div className="w-8 h-8 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
                            <Award size={18} />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">Refeições Salvas</p>
                        <p className="text-xl font-black text-secondary italic">{stats?.completedOrders || 0}</p>
                    </div>
                    <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-1">
                        <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <Save size={18} />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">Economia Total</p>
                        <p className="text-xl font-black text-primary italic">R$ {stats?.totalSaved?.toFixed(2) || '0.00'}</p>
                    </div>
                </div>

                {/* Sustainability Score (v1.0.8) */}
                <div className="px-6 mb-2">
                    <div className="bg-green-600 p-6 rounded-[32px] text-white relative overflow-hidden shadow-xl shadow-green-100">
                        <div className="absolute right-[-20px] top-[-20px] opacity-10">
                            <Award size={120} />
                        </div>
                        <div className="relative z-10 flex flex-col gap-4">
                            <div className="flex items-center gap-2">
                                <span className="bg-white/20 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Score Verde</span>
                                <div className="h-[2px] flex-1 bg-white/20"></div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-4xl font-black italic">{stats?.weightSaved?.toFixed(1) || '0.0'}<span className="text-sm ml-1">kg</span></p>
                                    <p className="text-[9px] font-bold uppercase opacity-80">Comida salva por você</p>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-2xl font-black italic">-{((stats?.weightSaved || 0) * 2.5).toFixed(1)}<span className="text-sm ml-1">kg</span></p>
                                    <p className="text-[9px] font-bold uppercase opacity-80">Emissões de CO2 evitadas</p>
                                </div>
                            </div>

                            <div className="bg-white/10 p-4 rounded-2xl border border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] font-black uppercase">Nível: Protetor do Recife</span>
                                    <span className="text-[9px] font-black uppercase">Próximo: Guardião</span>
                                </div>
                                <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(((stats?.weightSaved || 0) / 10) * 100, 100)}%` }}
                                        className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Details */}
                <div className="px-6 space-y-4 pb-8">
                    <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <h4 className="font-black text-gray-900 italic uppercase text-sm">Dados Cadastrais</h4>
                            <button
                                onClick={() => isEditing ? handleUpdate() : setIsEditing(true)}
                                className="text-primary text-xs font-black uppercase hover:underline flex items-center gap-1"
                            >
                                {isLoading ? <Loader2 size={14} className="animate-spin" /> : (isEditing ? 'Salvar' : 'Editar')}
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Mail className="text-gray-300" size={20} />
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase">E-mail</p>
                                    <p className="text-sm font-bold text-gray-800">{userData?.email || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <CreditCard className="text-gray-300" size={20} />
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase">CPF Para Retirada</p>
                                    <p className="text-sm font-bold text-gray-800">***.***.{userData?.cpf?.slice(-6) || '***-**'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <Phone className="text-gray-300" size={20} />
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase">Celular</p>
                                    {isEditing ? (
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full text-sm font-bold text-primary border-b border-primary/20 bg-transparent outline-none py-1"
                                        />
                                    ) : (
                                        <p className="text-sm font-bold text-gray-800">{userData?.phone || 'Não informado'}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Favorites Preview */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h4 className="font-black text-gray-900 italic uppercase text-sm">Meus Favoritos</h4>
                            <span className="text-[10px] font-black text-gray-400">{favoriteStores.length} LOJAS</span>
                        </div>

                        {favoriteStores.length === 0 ? (
                            <div className="bg-white/50 border-2 border-dashed border-gray-100 rounded-[32px] p-8 text-center">
                                <Heart className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                <p className="text-xs font-bold text-gray-400 uppercase">Você ainda não favoritou nenhuma loja.</p>
                            </div>
                        ) : (
                            favoriteStores.map(store => (
                                <div key={store.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between group cursor-pointer active:scale-95 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-surface-soft rounded-xl flex items-center justify-center text-primary border border-primary/10">
                                            <Save size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-800 uppercase">{store.name}</p>
                                            <p className="text-[10px] font-bold text-secondary uppercase italic">{store.category}</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-gray-300 group-hover:text-primary transition-colors" />
                                </div>
                            ))
                        )}
                    </div>

                    <button
                        onClick={onLogout}
                        className="w-full bg-white border-2 border-urgency/10 text-urgency p-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-urgency/5 transition-all active:scale-95 mt-4"
                    >
                        <LogOut size={18} />
                        ENCERRAR SESSÃO
                    </button>

                    <div className="text-center pt-4">
                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Recife Save App v1.0.8</p>
                    </div>
                </div>
            </main>
        </motion.div>
    )
}

export default UserProfile
