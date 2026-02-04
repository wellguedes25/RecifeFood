import { motion } from 'framer-motion'
import { Smartphone, Monitor, ChevronRight, Layout, ShieldCheck, Store } from 'lucide-react'

function PlatformSelector({ role, onSelect }) {
    return (
        <div className="min-h-screen bg-surface-soft flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent">
            <div className="w-full max-w-md space-y-12">
                <div className="text-center space-y-4">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white w-20 h-20 rounded-[32px] shadow-2xl shadow-primary/20 border-2 border-primary/10 flex items-center justify-center mx-auto"
                    >
                        <Layout className="text-primary w-10 h-10" />
                    </motion.div>
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black italic uppercase text-gray-900 leading-tight">Olá, {role === 'superadmin' ? 'Fundador' : 'Parceiro'}!</h2>
                        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em]">Como deseja acessar o painel hoje?</p>
                    </div>
                </div>

                <div className="grid gap-6">
                    <motion.button
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelect('app')}
                        className="group bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex items-center gap-6 text-left hover:shadow-xl hover:shadow-primary/5 transition-all"
                    >
                        <div className="bg-primary/10 p-5 rounded-3xl group-hover:bg-primary group-hover:text-white transition-colors">
                            <Smartphone size={32} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-black text-lg uppercase italic text-gray-900">Versão App</h3>
                            <p className="text-xs text-gray-400 font-medium">Design compacto para celular e tablets. Rápido e prático.</p>
                        </div>
                        <ChevronRight className="text-gray-200 group-hover:text-primary transition-colors" />
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelect('web')}
                        className="group bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex items-center gap-6 text-left hover:shadow-xl hover:shadow-secondary/5 transition-all"
                    >
                        <div className="bg-secondary/10 p-5 rounded-3xl group-hover:bg-secondary group-hover:text-white transition-colors">
                            <Monitor size={32} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-black text-lg uppercase italic text-gray-900">Versão Web</h3>
                            <p className="text-xs text-gray-400 font-medium">Layout expandido para Desktop. Ideal para gestão financeira.</p>
                        </div>
                        <ChevronRight className="text-gray-200 group-hover:text-secondary transition-colors" />
                    </motion.button>
                </div>

                <div className="flex flex-col items-center gap-4 pt-12">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-md rounded-full border border-gray-100">
                        {role === 'superadmin' ? <ShieldCheck size={14} className="text-secondary" /> : <Store size={14} className="text-primary" />}
                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest leading-none">Acesso Nível {role?.toUpperCase()}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PlatformSelector
