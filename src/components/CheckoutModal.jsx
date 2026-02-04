import { motion, AnimatePresence } from 'framer-motion'
import { X, CreditCard, QrCode, Copy, CheckCircle2, Loader2, ShieldCheck, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'

function CheckoutModal({ items, store, onConfirm, onClose }) {
    const [step, setStep] = useState('summary') // summary, pix, success
    const [isLoading, setIsLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    const total = Object.entries(items).reduce((acc, [id, qty]) => {
        const bag = store.bags.find(b => b.id === id)
        return acc + (bag?.discounted_price || 0) * qty
    }, 0)

    const handlePixPayment = () => {
        setIsLoading(true)
        setTimeout(() => {
            setIsLoading(false)
            setStep('pix')
        }, 1500)
    }

    const handleConfirmPayment = () => {
        setIsLoading(true)
        setTimeout(() => {
            setIsLoading(false)
            setStep('success')
            setTimeout(() => {
                onConfirm()
            }, 2000)
        }, 2000)
    }

    const copyPixKey = () => {
        navigator.clipboard.writeText('00020126580014BR.GOV.BCB.PIX0136e3b5e3a5-1d0a-4c79-925a-f958bbdc2b7f520400005303986540510.005802BR5913RECIFE SAVE6008RECIFE62070503***6304E2B1')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[500] flex items-end sm:items-center justify-center p-4 sm:p-6"
        >
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[48px] overflow-hidden shadow-2xl relative"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black italic uppercase text-gray-900 leading-tight">Pagamento</h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{store.name}</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:text-primary transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {step === 'summary' && (
                        <div className="space-y-6">
                            {/* Summary Card */}
                            <div className="bg-surface-soft p-6 rounded-[32px] space-y-4">
                                {Object.entries(items).map(([id, qty]) => {
                                    const bag = store.bags.find(b => b.id === id)
                                    return (
                                        <div key={id} className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary border border-primary/10">
                                                    <span className="font-black text-sm">{qty}x</span>
                                                </div>
                                                <p className="text-xs font-black uppercase text-gray-800">{bag.title}</p>
                                            </div>
                                            <p className="text-sm font-black text-gray-900 italic">R$ {(bag.discounted_price * qty).toFixed(2)}</p>
                                        </div>
                                    )
                                })}
                                <div className="h-[1px] bg-gray-200/50 w-full"></div>
                                <div className="flex justify-between items-center">
                                    <p className="text-xs font-black text-gray-400 uppercase">Total a Pagar</p>
                                    <p className="text-2xl font-black text-secondary italic">R$ {total.toFixed(2)}</p>
                                </div>
                            </div>

                            <button
                                onClick={handlePixPayment}
                                disabled={isLoading}
                                className="w-full bg-[#32BCAD] text-white p-6 rounded-[28px] font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-[#32BCAD]/20 active:scale-95 transition-all"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : (
                                    <>
                                        <QrCode size={24} />
                                        PAGAR COM PIX
                                    </>
                                )}
                            </button>

                            <div className="flex items-center justify-center gap-2 text-[10px] font-black text-gray-300 uppercase tracking-widest">
                                <ShieldCheck size={14} />
                                Pagamento 100% Seguro
                            </div>
                        </div>
                    )}

                    {step === 'pix' && (
                        <div className="text-center space-y-6">
                            <div className="relative inline-block p-4 bg-white border-4 border-surface-soft rounded-[40px] shadow-inner mb-2">
                                <div className="w-48 h-48 bg-gray-50 rounded-3xl flex items-center justify-center relative overflow-hidden">
                                    {/* Pix Simulation QR */}
                                    <div className="absolute inset-2 grid grid-cols-4 grid-rows-4 gap-1 opacity-20">
                                        {[...Array(16)].map((_, i) => <div key={i} className="bg-black rounded-sm" />)}
                                    </div>
                                    <QrCode size={100} className="text-gray-900 relative z-10" />
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-[#32BCAD] p-2 rounded-xl text-white shadow-lg">
                                    <div className="w-4 h-4" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-lg font-black uppercase italic text-gray-900">QR Code Gerado!</h4>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                                    Abra o app do seu banco e <br /> escaneie o código acima.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <button
                                    onClick={copyPixKey}
                                    className="w-full bg-surface-soft border-2 border-dashed border-gray-200 p-5 rounded-[24px] flex items-center justify-between group hover:border-[#32BCAD]/30 transition-all font-black text-xs uppercase"
                                >
                                    <span className="text-gray-400 group-hover:text-gray-900">{copied ? 'COPIADO!' : 'PIX COPIA E COLA'}</span>
                                    {copied ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} className="text-[#32BCAD]" />}
                                </button>

                                <div className="flex items-center justify-center gap-2 text-[10px] font-black text-orange-400 bg-orange-50 py-2 px-4 rounded-full uppercase italic animate-pulse">
                                    <Clock size={12} />
                                    Expira em 09:59
                                </div>
                            </div>

                            <button
                                onClick={handleConfirmPayment}
                                disabled={isLoading}
                                className="w-full bg-secondary text-white p-6 rounded-[28px] font-black text-lg shadow-xl shadow-secondary/20 active:scale-95 transition-all"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : 'JÁ PAGUEI'}
                            </button>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-10 space-y-6">
                            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-green-200 animate-bounce">
                                <CheckCircle2 className="w-12 h-12 text-white" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black italic uppercase text-gray-900">Sucesso!</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Seu pagamento foi confirmado.</p>
                            </div>
                            <p className="text-sm font-bold text-gray-800 bg-green-50 p-4 rounded-2xl border border-green-100 italic">
                                Sua sacola está reservada. <br /> Prepare-se para a retirada!
                            </p>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    )
}

export default CheckoutModal
