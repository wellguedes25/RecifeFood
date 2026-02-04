import { ChevronLeft, Heart, Share2, Info, MapPin, Clock, Calendar, ChevronDown, Minus, Plus, ShoppingBag, Store, Flame, Bell, BellRing, Phone } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

function StoreDetails({ store, onBack, onAddItem, userData }) {
    const [quantities, setQuantities] = useState({})
    const [isFollowing, setIsFollowing] = useState(false)

    useEffect(() => {
        if (userData?.following?.includes(store.id)) {
            setIsFollowing(true)
        }
    }, [userData, store.id])

    const toggleFollow = async () => {
        if (!userData) return alert('Faça login para seguir lojas!')

        const newFollowing = isFollowing
            ? userData.following.filter(id => id !== store.id)
            : [...(userData.following || []), store.id]

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ following: newFollowing })
                .eq('id', userData.id)

            if (error) throw error
            setIsFollowing(!isFollowing)
            // Update local userData ideally via state lifting, but for now this local state works for UI
        } catch (err) {
            console.error('Error following:', err)
        }
    }

    const updateQuantity = (bagId, delta) => {
        setQuantities(prev => {
            const current = prev[bagId] || 0
            const next = Math.max(0, current + delta)
            // Limit to available quantity
            const bag = store.bags?.find(b => b.id === bagId)
            if (bag && next > bag.quantity) return prev
            return { ...prev, [bagId]: next }
        })
    }

    const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0)
    const totalPrice = store.bags?.reduce((acc, bag) => acc + (quantities[bag.id] || 0) * bag.discounted_price, 0) || 0

    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed inset-0 bg-black/5 z-[60] overflow-y-auto pb-32 flex justify-center"
        >
            <div className="w-full max-w-2xl bg-white min-h-screen relative shadow-2xl">
                {/* Hero Header */}
                <div className="relative h-64 bg-gray-200">
                    <div className="absolute inset-0 bg-linear-to-b from-black/40 via-transparent to-black/20" />
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                        <button onClick={onBack} className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white active:scale-90 transition-all">
                            <ChevronLeft size={24} />
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={toggleFollow}
                                className={`p-2 backdrop-blur-md rounded-full text-white active:scale-90 transition-all ${isFollowing ? 'bg-secondary' : 'bg-black/20'}`}
                            >
                                {isFollowing ? <BellRing size={20} className="animate-pulse" /> : <Bell size={20} />}
                            </button>
                            <button className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white active:scale-90 transition-all">
                                <Heart size={20} />
                            </button>
                            <button className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white active:scale-90 transition-all">
                                <Share2 size={20} />
                            </button>
                            <button className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white active:scale-90 transition-all">
                                <Info size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Store Logo Overlay */}
                    <div className="absolute -bottom-6 left-6 bg-white p-1.5 rounded-3xl shadow-2xl border border-gray-100">
                        <div className="w-20 h-20 bg-surface-soft rounded-2xl overflow-hidden flex items-center justify-center">
                            {store.logo_url ? (
                                <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                            ) : (
                                <Store className="text-primary w-10 h-10" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Store Content */}
                <div className="px-6 pt-10 space-y-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight uppercase italic">{store.name}</h1>
                        </div>
                        <p className="text-secondary font-black text-sm">218 sacolas vendidas!</p>
                        {store.description && (
                            <p className="text-xs text-gray-400 font-medium leading-relaxed mt-2">{store.description}</p>
                        )}
                    </div>

                    {/* Score & Distance */}
                    <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                        <span className="flex items-center gap-1"><span className="text-yellow-500">★</span> 4.0</span>
                        <span>{store.category}</span>
                        {store.phone && <span className="flex items-center gap-1"><Phone size={12} /> {store.phone}</span>}
                    </div>

                    {/* Resgate Info */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-gray-600 bg-orange-50 w-full px-4 py-3 rounded-2xl border border-orange-100">
                            <Calendar size={18} className="text-orange-500" />
                            <div className="flex-1">
                                <span className="text-xs font-black text-orange-800 uppercase block tracking-widest">Retire Hoje</span>
                                <span className="text-sm font-bold text-orange-950">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 text-gray-600 pt-2 border-t border-gray-50">
                            <MapPin size={18} className="text-gray-400 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-gray-800">{store.address}</p>
                                <p className="text-xs font-medium text-gray-400">Recife - PE</p>
                                <button className="text-primary text-sm font-black mt-1 hover:underline uppercase tracking-tighter text-[10px]">Ver rota no mapa</button>
                            </div>
                        </div>
                    </div>

                    {/* Feedback Accordion */}
                    <button className="w-full flex justify-between items-center p-4 bg-orange-50/50 rounded-2xl border border-orange-100/50 text-orange-900 group text-left">
                        <span className="font-black italic">O que estão dizendo?</span>
                        <ChevronDown size={20} className="group-hover:translate-y-0.5 transition-transform" />
                    </button>

                    {/* Filters */}
                    <div className="flex gap-4 pt-2">
                        <button className="flex-1 flex justify-between items-center px-4 py-3 bg-surface-soft rounded-2xl border border-gray-100 text-gray-600 text-sm font-black">
                            Todas as categorias
                            <ChevronDown size={16} />
                        </button>
                        <button className="flex-1 flex justify-between items-center px-4 py-3 bg-surface-soft rounded-2xl border border-gray-100 text-gray-600 text-sm font-black">
                            Tipo
                            <ChevronDown size={16} />
                        </button>
                    </div>

                    {/* Bags List */}
                    <div className="space-y-4 pt-4">
                        {store.bags?.map(bag => (
                            <div key={bag.id} className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-6 relative overflow-hidden group">
                                <div className="relative z-10 w-24 h-24 bg-surface-soft rounded-2xl flex items-center justify-center border border-primary/10 shrink-0">
                                    <ShoppingBag className="text-primary w-10 h-10" />
                                    <div className="absolute -top-2 -left-2 bg-urgency text-white px-2 py-1 font-black text-[9px] rounded-lg shadow-lg">
                                        -50%
                                    </div>
                                </div>

                                <div className="flex-1 space-y-1 py-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-gray-900 text-lg uppercase italic leading-tight">{bag.title}</h3>
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-[9px] font-black rounded-lg uppercase tracking-widest shrink-0">{store.category}</span>
                                        {bag.is_urgent && (
                                            <motion.span
                                                animate={{ scale: [1, 1.1, 1] }}
                                                transition={{ repeat: Infinity, duration: 1.5 }}
                                                className="px-2 py-0.5 bg-urgence text-white text-[9px] font-black rounded-lg uppercase tracking-widest shrink-0 shadow-lg shadow-urgence/20"
                                            >
                                                URGENTE 🔥
                                            </motion.span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 font-medium line-clamp-2">{bag.description}</p>

                                    <div className="flex items-center gap-4 pt-1">
                                        <div className="flex items-center gap-1.5 text-[11px] font-black text-secondary">
                                            <ShoppingBag size={12} />
                                            <span>{bag.quantity} sacolas</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[11px] font-black text-gray-400">
                                            <Clock size={12} />
                                            <span>{bag.pickup_window || '18:00 - 20:00'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4">
                                        <div>
                                            <p className="text-xs line-through text-gray-300 font-bold italic">R$ {bag.original_price?.toFixed(2)}</p>
                                            <p className="text-2xl font-black text-secondary italic leading-none">R$ {bag.discounted_price?.toFixed(2)}</p>
                                        </div>

                                        {/* Quantity Selector */}
                                        <div className="flex items-center gap-4 bg-surface-soft p-2 rounded-2xl border border-gray-100">
                                            <button
                                                onClick={() => updateQuantity(bag.id, -1)}
                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-primary active:scale-90 transition-all"
                                            >
                                                <Minus size={20} />
                                            </button>
                                            <span className="text-lg font-black text-gray-900 w-4 text-center">
                                                {quantities[bag.id] || 0}
                                            </span>
                                            <button
                                                onClick={() => updateQuantity(bag.id, 1)}
                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-primary hover:bg-white shadow-sm active:scale-90 transition-all"
                                            >
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sticky Bottom Bar */}
                {totalItems > 0 && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white/80 backdrop-blur-xl border-t border-gray-100 p-6 z-50 flex flex-col gap-4 shadow-[0_-20px_50px_rgba(0,0,0,0.1)]"
                    >
                        <div className="bg-urgency text-white px-4 py-2 rounded-full font-black text-[11px] uppercase tracking-widest text-center animate-pulse">
                            {totalItems} Sacola{totalItems > 1 ? 's' : ''} apenas! corra pra salvar 🔥
                        </div>
                        <button
                            onClick={() => onAddItem(quantities)}
                            className="w-full bg-primary hover:bg-[#C49232] text-white py-4 rounded-2xl font-black text-xl shadow-xl shadow-primary/30 active:scale-95 transition-all flex items-center justify-between px-8"
                        >
                            <span>RESERVAR AGORA</span>
                            <span className="italic">R$ {totalPrice.toFixed(2)}</span>
                        </button>
                    </motion.div>
                )}
            </div>
        </motion.div>
    )
}

export default StoreDetails
