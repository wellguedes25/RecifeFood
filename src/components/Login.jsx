import { useState } from 'react'
import { MapPin, Mail, ArrowRight, User, CreditCard, Phone, CheckCircle2, ChevronLeft, Loader2, Lock, Eye, EyeOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

function Login({ onLogin, onGuest }) {
    const [mode, setMode] = useState('landing') // 'landing', 'signup', 'signin'
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        cpf: '',
        fullName: '',
        phone: '',
        terms: false
    })

    const maskCPF = (value) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1')
    }

    const maskPhone = (value) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .replace(/(-\d{4})\d+?$/, '$1')
    }

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target
        let maskedValue = value
        setError('')

        if (name === 'cpf') maskedValue = maskCPF(value)
        if (name === 'phone') maskedValue = maskPhone(value)

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : maskedValue
        }))
    }

    const handleSignUp = async () => {
        setIsLoading(true)
        setError('')
        try {
            const { data, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        cpf: formData.cpf,
                        phone: formData.phone
                    }
                }
            })

            if (authError) throw authError

            if (data.user && !data.session) {
                setError('sucesso: Verifique seu e-mail para confirmar o cadastro e depois faça login!')
                setTimeout(() => setMode('signin'), 3000)
            } else if (data.user) {
                onLogin(data.user)
            }
        } catch (err) {
            console.error('Erro no signup:', err)
            if (err.message.includes('User already registered')) {
                setError('Este e-mail já está cadastrado.')
            } else {
                setError(err.message)
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handleSignIn = async () => {
        setIsLoading(true)
        setError('')
        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            })

            if (authError) throw authError
            onLogin(data.user)
        } catch (err) {
            setError('E-mail ou senha incorretos.')
        } finally {
            setIsLoading(false)
        }
    }

    const isSignupValid = formData.email && formData.password.length >= 6 && formData.cpf.length === 14 && formData.fullName && formData.phone && formData.terms
    const isSigninValid = formData.email && formData.password.length >= 6

    return (
        <div className="min-h-screen bg-surface-soft flex justify-center w-full">
            <div className="w-full max-w-2xl bg-white flex flex-col items-center justify-between p-6 shadow-2xl relative">
                <AnimatePresence mode="wait">
                    {mode === 'landing' && (
                        <motion.div
                            key="landing"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex-1 flex flex-col items-center justify-center w-full max-w-md space-y-12"
                        >
                            <div className="flex flex-col items-center space-y-4">
                                <motion.div
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: 1 }}
                                    className="bg-white p-4 rounded-[40px] shadow-2xl shadow-primary/20 border-2 border-primary/10"
                                >
                                    <img src="/logo.png" alt="Recife Save Logo" className="w-24 h-24 object-contain" />
                                </motion.div>
                                <div className="text-center">
                                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter italic">Recife Save</h1>
                                    <p className="text-gray-500 font-medium">Sustentabilidade em cada escolha</p>
                                </div>
                            </div>

                            <div className="w-full space-y-4">
                                <button
                                    onClick={() => setMode('signup')}
                                    className="w-full bg-primary text-white p-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all"
                                >
                                    CRIAR CONTA
                                    <ArrowRight className="w-5 h-5" />
                                </button>

                                <button
                                    onClick={() => setMode('signin')}
                                    className="w-full bg-white border-2 border-primary/20 text-primary p-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:bg-primary/5 transition-all active:scale-95"
                                >
                                    JÁ TENHO CONTA
                                </button>

                                <div className="relative py-4">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-200"></div>
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase font-black text-gray-400">
                                        <span className="bg-white px-4 tracking-widest">ou</span>
                                    </div>
                                </div>

                                <button
                                    onClick={onGuest}
                                    className="w-full bg-white border-2 border-gray-100 text-gray-600 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:border-primary/20 transition-all active:scale-95"
                                >
                                    <User className="w-5 h-5" />
                                    CONHECER ESTABELECIMENTOS
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {mode === 'signup' && (
                        <motion.div
                            key="signup"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex-1 w-full max-w-md space-y-6 py-4 overflow-y-auto scrollbar-none"
                        >
                            <button onClick={() => setMode('landing')} className="p-2 -ml-2 text-gray-400 hover:text-primary transition-colors">
                                <ChevronLeft size={28} />
                            </button>

                            <div className="space-y-2 text-left">
                                <h2 className="text-3xl font-black text-gray-900 italic uppercase">Criar Conta</h2>
                                <p className="text-gray-400 font-medium text-sm">Cadastre-se para economizar e salvar comida.</p>
                            </div>

                            {error && (
                                <div className="bg-urgency/10 text-urgency p-4 rounded-xl text-xs font-bold border border-urgency/20">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-3">
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input disabled={isLoading} type="text" name="fullName" placeholder="Nome Completo" value={formData.fullName} onChange={handleInputChange} className="w-full bg-white border border-gray-100 p-4 pl-12 rounded-2xl font-bold text-gray-800 outline-none focus:border-primary transition-all shadow-sm" />
                                </div>
                                <div className="relative">
                                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input disabled={isLoading} type="text" name="cpf" placeholder="Seu CPF (Somente cadastro)" value={formData.cpf} onChange={handleInputChange} className="w-full bg-white border border-gray-100 p-4 pl-12 rounded-2xl font-bold text-gray-800 outline-none focus:border-primary transition-all shadow-sm" />
                                </div>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input disabled={isLoading} type="tel" name="phone" placeholder="Celular (WhatsApp)" value={formData.phone} onChange={handleInputChange} className="w-full bg-white border border-gray-100 p-4 pl-12 rounded-2xl font-bold text-gray-800 outline-none focus:border-primary transition-all shadow-sm" />
                                </div>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input disabled={isLoading} type="email" name="email" placeholder="Seu melhor E-mail" value={formData.email} onChange={handleInputChange} className="w-full bg-white border border-gray-100 p-4 pl-12 rounded-2xl font-bold text-gray-800 outline-none focus:border-primary transition-all shadow-sm" />
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input disabled={isLoading} type={showPassword ? "text" : "password"} name="password" placeholder="Criar Senha (mín. 6 dígitos)" value={formData.password} onChange={handleInputChange} className="w-full bg-white border border-gray-100 p-4 pl-12 pr-12 rounded-2xl font-bold text-gray-800 outline-none focus:border-primary transition-all shadow-sm" />
                                    <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                <label className="flex items-start gap-3 p-2 cursor-pointer">
                                    <input disabled={isLoading} type="checkbox" name="terms" checked={formData.terms} onChange={handleInputChange} className="mt-1 w-5 h-5 rounded-md border-2 border-gray-200 text-primary focus:ring-primary" />
                                    <span className="text-[11px] text-gray-400 font-medium text-left">Eu li e concordo com os <span className="text-primary font-bold underline">termos de uso</span> do Recife Save.</span>
                                </label>
                                <button
                                    disabled={!isSignupValid || isLoading}
                                    onClick={handleSignUp}
                                    className={`w-full p-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 ${isSignupValid && !isLoading ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-gray-200 text-gray-400'}`}
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'FINALIZAR CADASTRO'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {mode === 'signin' && (
                        <motion.div
                            key="signin"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex-1 w-full max-w-md space-y-8 py-4"
                        >
                            <button onClick={() => setMode('landing')} className="p-2 -ml-2 text-gray-400 hover:text-primary transition-colors">
                                <ChevronLeft size={28} />
                            </button>

                            <div className="space-y-2 text-left">
                                <h2 className="text-3xl font-black text-gray-900 italic uppercase">Acessar Conta</h2>
                                <p className="text-gray-400 font-medium text-sm">Entre com seu e-mail e senha cadastrados.</p>
                            </div>

                            {error && (
                                <div className="bg-urgency/10 text-urgency p-4 rounded-xl text-xs font-bold border border-urgency/20">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input disabled={isLoading} type="email" name="email" placeholder="E-mail" value={formData.email} onChange={handleInputChange} className="w-full bg-white border border-gray-100 p-4 pl-12 rounded-2xl font-bold text-gray-800 outline-none focus:border-primary transition-all shadow-sm" />
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input disabled={isLoading} type={showPassword ? "text" : "password"} name="password" placeholder="Sua Senha" value={formData.password} onChange={handleInputChange} className="w-full bg-white border border-gray-100 p-4 pl-12 pr-12 rounded-2xl font-bold text-gray-800 outline-none focus:border-primary transition-all shadow-sm" />
                                    <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                <button
                                    disabled={!isSigninValid || isLoading}
                                    onClick={handleSignIn}
                                    className={`w-full p-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 ${isSigninValid && !isLoading ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-gray-200 text-gray-400'}`}
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ENTRAR'}
                                </button>
                                <button
                                    onClick={() => setMode('signup')}
                                    className="w-full text-center text-sm font-bold text-gray-400 hover:text-primary transition-colors"
                                >
                                    Não tem conta? <span className="underline italic">Crie uma agora!</span>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer Credits */}
                {!isLoading && (
                    <motion.div className="w-full max-w-md pt-6 border-t border-gray-100 flex flex-col items-center gap-3 text-center">
                        <div className="flex items-center gap-3 text-secondary bg-secondary/5 px-4 py-2 rounded-full border border-secondary/10">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Recife, Pernambuco</span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed max-w-[280px]">
                            Autenticação segura via Recife Save Protocol.
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    )
}

export default Login
