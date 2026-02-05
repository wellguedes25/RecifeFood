# Documentação Técnica e Funcional - Recife Save ♻️🥘

## 1. Visão Geral (O Objeto)
O **Recife Save** é uma plataforma marketplace focada no combate ao desperdício de alimentos. O objetivo principal é conectar estabelecimentos do setor alimentício (padarias, restaurantes, hortifrútis) que possuem excedentes de produção ou produtos próximos ao vencimento, mas perfeitamente aptos para consumo, a consumidores interessados em adquirir esses itens com altos descontos (geralmente 50% ou mais).

A plataforma atende aos **Objetivos de Desenvolvimento Sustentável da ONU (ODS 2 - Fome Zero e ODS 12 - Consumo e Produção Responsáveis)**, promovendo uma economia circular onde todos ganham:
*   **Comerciantes:** Reduzem perdas financeiras e atraem novos clientes.
*   **Consumidores:** Acessam comida de qualidade por preços acessíveis.
*   **Ambiente:** Diminuição da emissão de gases de efeito estufa provenientes do descarte de alimentos em aterros.

---

## 2. Personas e Acesso
O sistema possui três níveis de acesso distintos:
1.  **Cliente (Customer):** Usuário final que busca, reserva e paga pelas sacolas.
2.  **Lojista (Merchant/Estabelecimento):** Proprietário que cadastra e gerencia as sacolas, confirma retiradas e monitora vendas.
3.  **Administrador (SuperAdmin):** Gestor da plataforma que monitora a saúde global do ecossistema, métricas de impacto e suporte.

---

## 3. Fluxo de Funcionamento (Ponta a Ponta)

### 3.1. Cadastro e Perfil
*   **Usuário Comum:** Realiza login via e-mail/senha ou Google (via Supabase Auth). No primeiro acesso, preenche dados básicos (Nome, CPF, Celular).
*   **Merchant:** Geralmente vinculado a um `establishment_id` no banco de dados. Ao logar, o sistema detecta a role `merchant` e redireciona automaticamente para o **Painel Administrativo**.

### 3.2. Jornada do Cliente
1.  **Exploração:** O cliente visualiza as ofertas em três modos: Lista (ordenada por destaques/relevância), Mapa (proximidade) ou Categorias.
2.  **Carrinho Global:** Permite adicionar itens de **múltiplos lojistas**. O carrinho é persistido no `localStorage`.
3.  **Validação de Conflitos:** O sistema emite alertas se o usuário tentar comprar sacolas de lojas muito distantes entre si (>5km) ou com horários de retirada muito próximos (janelas menores que 30min).
4.  **Reserva:** Os itens ficam listados no checkout aguardando a finalização do pagamento.

### 3.3. Pagamento e Checkout de Cobrança
*   **Métodos Aceitos:** PIX (QR Code dinâmico via PagSeguro) e Cartão de Crédito/Débito.
*   **Salvar Cartão:** O usuário pode tokenizar seu cartão para compras rápidas. Os dados são armazenados de forma segura (tokenizada) vinculados ao perfil.
*   **Finalização:** Ao confirmar o pagamento, o sistema itera sobre o carrinho e gera um registro na tabela `orders` para cada sacola, garantindo o controle individual por lojista.

---

## 4. Monetização e Cobrança (Modelo de Negócio)

A plataforma monetiza de duas formas principais, integradas diretamente no fluxo de pagamento:

### 4.1. Taxa de Intermediação (Comissão)
*   **Funcionamento:** Uma porcentagem é aplicada sobre o valor de cada sacola vendida.
*   **Implementação (Split Payment):** No momento da transação (Pix ou Cartão), o sistema utiliza a lógica de **Split de Pagamento**. O valor total pago pelo cliente é dividido entre a conta do **Estabelecimento** (valor do produto) e a conta da **Plataforma** (valor da comissão).
*   **Automação:** O sistema utiliza o campo `pagseguro_account` de cada estabelecimento para direcionar os fundos automaticamente via API do gateway.

### 4.2. Impulso de Sacolas (Boost)
*   **Funcionamento:** Taxa fixa (ex: R$ 2,00) por cada ativação de impulso.
*   **Benefícios para o Lojista:**
    *   Selo **"URGENTE 🔥"** na sacola.
    *   Exclusividade no carrossel de **"Destaques da Semana"**.
    *   Prioridade de exibição no Mapa e nos resultados de busca.
*   **Cobrança:** Registrada na tabela `boost_usages` para faturamento posterior ou desconto no repasse seguinte.

---

## 5. Painéis e Indicadores (Dashboard)

### 5.1. Painel do Lojista (Administrativo)
Focado no controle operacional e financeiro imediato:
*   **Voucher Validator:** Ferramenta central para o balcão. O lojista digita o código do cliente para marcar a sacola como "Coletada", liberando o repasse financeiro.
*   **Receita Bruta:** Total acumulado de vendas processadas.
*   **Rating (Nota):** Média ponderada das avaliações dos clientes sobre a qualidade das sacolas e do atendimento.
*   **Status em Tempo Real:** Chave de controle para abrir/fechar a loja no marketplace instantaneamente.
*   **Gestão de Inventário:** Interface para criar sacolas com campos específicos: Preço original vs. com desconto, tipo de alimentos, restrições (vegano, etc) e janela de retirada.

### 5.2. Painel do SuperAdmin (Gestão Geral)
Focado na saúde do ecossistema e escalabilidade:
*   **Faturamento da Plataforma:** Visualização clara das receitas de comissão e venda de boosts.
*   **Métricas ODS (Impacto Social):** Total de quilos de comida salvos e economia gerada para os usuários.
*   **Monitoramento de Lojas:** Lista de estabelecimentos ativos, bloqueados ou pendentes de aprovação.
*   **Logs de Erros de Cobrança:** Monitoramento em tempo real de falhas no processamento de split ou geração de PIX.

---

## 6. Fluxo de Confirmação de Retirada
1.  O cliente finaliza o pagamento.
2.  O pedido muda para status `pending` (ou `completed` em casos de cartão).
3.  Um voucher (QR Code ou código curto) é gerado para o cliente.
4.  O cliente vai ao estabelecimento no horário da janela de retirada.
5.  O lojista valida o código no seu **Painel Admin**.
6.  O status do pedido é alterado para `collected`, concluindo o ciclo.
