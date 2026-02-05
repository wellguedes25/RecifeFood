import { motion, AnimatePresence } from 'framer-motion'
import { X, CreditCard, QrCode, Copy, CheckCircle2, Loader2, ShieldCheck, Clock, Store } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function CheckoutModal({ cart, onConfirm, onClose, onRemoveItem, userData }) {
    const [step, setStep] = useState('summary') // summary, pix, success
    const [isLoading, setIsLoading] = useState(false)
    const [copied, setCopied] = useState(false)
    const [pixData, setPixData] = useState(null)
    const [paymentMethod, setPaymentMethod] = useState('pix') // pix, card, saved_card
    const [cardData, setCardData] = useState({ number: '', name: '', expiry: '', cvc: '' })
    const [saveCard, setSaveCard] = useState(true)

    // Group items by merchant
    const groupedItems = cart.reduce((acc, item) => {
        const storeId = item.store.id
        if (!acc[storeId]) {
            acc[storeId] = {
                store: item.store,
                items: []
            }
        }
        acc[storeId].items.push(item)
        return acc
    }, {})

    // Check if user has a saved card
    useEffect(() => {
        if (userData?.saved_card) {
            setPaymentMethod('saved_card')
        }
    }, [userData])

    const total = cart.reduce((acc, item) => {
        return acc + (item.bag.discounted_price * item.quantity)
    }, 0)

    const handleProcessPayment = async () => {
        if (paymentMethod === 'pix') {
            await handlePixPayment()
        } else {
            // Both 'card' and 'saved_card' call handleCardPayment
            // handleCardPayment will only save card details if paymentMethod is 'card' and saveCard is true
            await handleCardPayment()
        }
    }

    const handleCardPayment = async () => {
        setIsLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Usuário não autenticado")

            // Create orders in sequence
            for (const item of cart) {
                const { error: orderError } = await supabase
                    .from('orders')
                    .insert({
                        user_id: user.id,
                        bag_id: item.bag.id,
                        amount: item.bag.discounted_price * item.quantity,
                        status: 'completed', // For card, we simulate instant confirmation
                        payment_method: 'card'
                    })
                if (orderError) throw orderError
            }

            // Prepare receivers for split (if processing via a gateway that supports it)
            const receivers = Object.values(groupedItems).map(group => ({
                account_id: group.store.pagseguro_account,
                amount: group.items.reduce((acc, item) => acc + (item.bag.discounted_price * item.quantity), 0)
            })).filter(r => r.account_id)

            // Here we would call the Card processing logic with Split info
            // For now, it remains a successful mockup as requested
            console.log('Split Payment logic for Card:', receivers)
            if (saveCard && paymentMethod === 'card') {
                await supabase.from('profiles').update({
                    saved_card: JSON.stringify({
                        brand: 'visa',
                        last4: cardData.number.slice(-4),
                        holder: cardData.name
                    })
                }).eq('id', user.id)
            }

            setStep('success')
            setTimeout(() => onConfirm(), 2000)

        } catch (error) {
            console.error('Erro no pagamento:', error)
            alert('Erro ao processar cartão: ' + (error.message || 'Dados inválidos.'))
        } finally {
            setIsLoading(false)
        }
    }

    const handlePixPayment = async () => {
        setIsLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Usuário não autenticado")

            // Multi-item Pix is complex because the Edge Function expects one orderId
            // For now, we'll create the orders and use the first one as reference for Pix
            // In a production environment, you'd create one 'parent' order or adjust the API

            let firstOrderId = null;
            for (const item of cart) {
                const { data: order, error: orderError } = await supabase
                    .from('orders')
                    .insert({
                        user_id: user.id,
                        bag_id: item.bag.id,
                        amount: item.bag.discounted_price * item.quantity,
                        status: 'pending',
                        payment_method: 'pix'
                    })
                    .select()
                    .single()

                if (orderError) throw orderError
                if (!firstOrderId) firstOrderId = order.id
            }

            // 2. Prepare receivers list for Split Payment
            const receivers = Object.values(groupedItems).map(group => ({
                account_id: group.store.pagseguro_account,
                amount: group.items.reduce((acc, item) => acc + (item.bag.discounted_price * item.quantity), 0)
            })).filter(r => r.account_id)

            // 3. Chamar a Edge Function para gerar o PIX real no PagSeguro
            const { data, error: functionError } = await supabase.functions.invoke('process-payment', {
                body: {
                    orderId: firstOrderId,
                    paymentMethod: 'pix',
                    receivers: receivers
                }
            })

            if (functionError) throw functionError

            // 3. Salvar os dados do PIX (QR Code e Texto)
            const qrCode = data.qr_codes?.[0]
            if (qrCode) {
                setPixData({
                    text: qrCode.text,
                    image: qrCode.links.find(l => l.rel === 'qr_code')?.href
                })
                setStep('pix')
            } else {
                throw new Error("Não foi possível gerar o QR Code PIX")
            }

        } catch (error) {
            console.error('Erro no pagamento:', error)
            alert('Erro ao processar pagamento: ' + (error.message || 'Tente novamente.'))
        } finally {
            setIsLoading(false)
        }
    }

    const handleConfirmPayment = () => {
        setIsLoading(true)
        // Aqui poderíamos verificar se o pagamento foi realmente confirmado via webhook ou polling
        // Por enquanto, seguimos o fluxo para sucesso após o usuário clicar em "JÁ PAGUEI"
        setTimeout(() => {
            setIsLoading(false)
            setStep('success')
            setTimeout(() => {
                onConfirm()
            }, 2000)
        }, 1500)
    }

    const copyPixKey = () => {
        if (!pixData?.text) return
        navigator.clipboard.writeText(pixData.text)
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
                        <h3 className="text-xl font-black italic uppercase text-gray-900 leading-tight">Checkout</h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{cart.length} itens no total</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:text-primary transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {step === 'summary' && (
                        <div className="space-y-6">
                            {/* Summary Card */}
                            <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                                {Object.values(groupedItems).map(group => (
                                    <div key={group.store.id} className="bg-surface-soft p-5 rounded-[32px] space-y-3">
                                        <div className="flex items-center gap-2 px-1">
                                            <Store size={14} className="text-primary" />
                                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{group.store.name}</p>
                                        </div>
                                        {group.items.map(item => (
                                            <div key={item.bag.id} className="flex justify-between items-center bg-white/50 p-3 rounded-2xl border border-white">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-primary border border-primary/10">
                                                        <span className="font-black text-[10px]">{item.quantity}x</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase text-gray-800 leading-tight">{item.bag.title}</p>
                                                        <p className="text-[9px] font-bold text-gray-400 italic">R$ {item.bag.discounted_price.toFixed(2)} un.</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <p className="text-xs font-black text-gray-900 italic">R$ {(item.bag.discounted_price * item.quantity).toFixed(2)}</p>
                                                    <button
                                                        onClick={() => onRemoveItem(item.bag.id)}
                                                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>

                            <div className="bg-surface-soft p-6 rounded-[32px] flex justify-between items-center border-t border-gray-100">
                                <p className="text-xs font-black text-gray-400 uppercase">Total Geral</p>
                                <p className="text-2xl font-black text-secondary italic">R$ {total.toFixed(2)}</p>
                            </div>

                            {/* Payment Method Selector */}
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Forma de Pagamento</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setPaymentMethod('pix')}
                                        className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === 'pix' ? 'border-[#32BCAD] bg-[#32BCAD]/5 text-[#32BCAD]' : 'border-gray-100 bg-surface-soft text-gray-400'}`}
                                    >
                                        <QrCode size={20} />
                                        <span className="text-[8px] font-black uppercase">PIX</span>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('card')}
                                        className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === 'card' ? 'border-secondary bg-secondary/5 text-secondary' : 'border-gray-100 bg-surface-soft text-gray-400'}`}
                                    >
                                        <CreditCard size={20} />
                                        <span className="text-[8px] font-black uppercase">Cartão</span>
                                    </button>
                                    {userData?.saved_card && (
                                        <button
                                            onClick={() => setPaymentMethod('saved_card')}
                                            className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === 'saved_card' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 bg-surface-soft text-gray-400'}`}
                                        >
                                            <div className="relative">
                                                <CreditCard size={20} />
                                                <div className="absolute -top-1 -right-1 bg-primary w-2 h-2 rounded-full" />
                                            </div>
                                            <span className="text-[8px] font-black uppercase text-center">Salvo</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Saved Card Preview */}
                            <AnimatePresence>
                                {paymentMethod === 'saved_card' && userData?.saved_card && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="bg-gradient-to-br from-gray-900 to-black p-5 rounded-[28px] text-white flex justify-between items-center shadow-lg mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-white/10 p-2.5 rounded-xl">
                                                    <CreditCard size={24} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Visa Final {JSON.parse(userData.saved_card).last4}</p>
                                                    <p className="text-sm font-black uppercase italic tracking-widest">{JSON.parse(userData.saved_card).holder}</p>
                                                </div>
                                            </div>
                                            <div className="bg-primary/20 p-2 rounded-xl">
                                                <CheckCircle2 size={18} className="text-primary" />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Card Form */}
                            <AnimatePresence>
                                {paymentMethod === 'card' && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="space-y-4 overflow-hidden"
                                    >
                                        <div className="space-y-3">
                                            <input
                                                type="text"
                                                placeholder="Número do Cartão"
                                                value={cardData.number}
                                                onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                                                className="w-full bg-surface-soft p-4 rounded-2xl font-bold text-xs border border-gray-100 outline-none focus:ring-2 ring-secondary/10"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Nome no Cartão"
                                                value={cardData.name}
                                                onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                                                className="w-full bg-surface-soft p-4 rounded-2xl font-bold text-xs border border-gray-100 outline-none focus:ring-2 ring-secondary/10"
                                            />
                                            <div className="grid grid-cols-2 gap-3">
                                                <input
                                                    type="text"
                                                    placeholder="Validade (MM/AA)"
                                                    value={cardData.expiry}
                                                    onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                                                    className="w-full bg-surface-soft p-4 rounded-2xl font-bold text-xs border border-gray-100 outline-none focus:ring-2 ring-secondary/10"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="CVC"
                                                    value={cardData.cvc}
                                                    onChange={(e) => setCardData({ ...cardData, cvc: e.target.value })}
                                                    className="w-full bg-surface-soft p-4 rounded-2xl font-bold text-xs border border-gray-100 outline-none focus:ring-2 ring-secondary/10"
                                                />
                                            </div>
                                            <label className="flex items-center gap-3 px-2 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={saveCard}
                                                    onChange={(e) => setSaveCard(e.target.checked)}
                                                    className="w-4 h-4 rounded border-gray-300 text-secondary focus:ring-secondary"
                                                />
                                                <span className="text-[10px] font-bold text-gray-500 uppercase group-hover:text-gray-900 transition-colors">Salvar cartão para próximas compras</span>
                                            </label>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <button
                                onClick={handleProcessPayment}
                                disabled={isLoading}
                                className={`w-full text-white p-6 rounded-[28px] font-black text-lg flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all ${paymentMethod === 'pix' ? 'bg-[#32BCAD] shadow-[#32BCAD]/20' : 'bg-secondary shadow-secondary/20'}`}
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : (
                                    <>
                                        {paymentMethod === 'pix' ? <QrCode size={24} /> : <CreditCard size={24} />}
                                        {paymentMethod === 'pix' ? 'PAGAR COM PIX' : 'PAGAR COM CARTÃO'}
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
                                    {/* Pix Real QR from PagSeguro */}
                                    {pixData?.image ? (
                                        <img src={pixData.image} alt="PIX QR Code" className="w-full h-full object-contain relative z-10" />
                                    ) : (
                                        <QrCode size={100} className="text-gray-900 relative z-10" />
                                    )}
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
