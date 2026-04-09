import React, { useEffect, useState } from 'react'
import { uiAlert } from '@contexts/DialogContext'
import { useNavigate } from 'react-router-dom';
import { paymentAPI, CreatePaymentIntentRequest, PaymentIntent, MockStripeResponse } from '@api/subscription/payment/payment';
import { getBalance } from '@api/user/wallet';
import { PSelect, PInput, PButton, PAlert } from '@ui';
import { ROUTES } from '@constants';
import { useConfig } from '@contexts/ConfigContext';
import { useI18n } from '@shared/i18n';

const Payment: React.FC = () => {
  const { t, locale } = useI18n();
  const { walletRechargeWithdrawEnabled } = useConfig();
  const walletOpsDisabled = !walletRechargeWithdrawEnabled;
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [stripeResponse, setStripeResponse] = useState<MockStripeResponse | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadBalance();
  }, [currency]);

  const loadBalance = async () => {
    try {
      const response = await getBalance(currency);
      setBalance(response.data.balance);
    } catch (error) {
      console.error(t('pages.payment.logs.loadBalanceFailed'), error);
    }
  };

  const handleCreatePaymentIntent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (walletOpsDisabled) {
      uiAlert(t('pages.payment.alerts.walletDisabled'));
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      uiAlert(t('pages.payment.alerts.invalidAmount'));
      return;
    }

    setLoading(true);
    try {
      const amountInCents = Math.round(parseFloat(amount) * 100); // 
      
      const request: CreatePaymentIntentRequest = {
        amount: amountInCents,
        currency,
        description: description || t('pages.payment.defaultDescription', { amount, currency }),
        payment_method_types: ['card'],
        confirmation_method: 'automatic',
        capture_method: 'automatic',
        metadata: {
          source: 'wallet_recharge',
          user_action: 'recharge'
        }
      };

      const response = await paymentAPI.createPaymentIntent(request);
      setPaymentIntent(response.payment_intent);
      setStripeResponse(response.stripe_mock_response);
      
      uiAlert(t('pages.payment.alerts.intentCreated'));
    } catch (error: any) {
      uiAlert(`${t('pages.payment.alerts.createFailedPrefix')}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePaymentSession = async () => {
    if (walletOpsDisabled) {
      uiAlert(t('pages.payment.alerts.walletDisabled'));
      return;
    }
    if (!paymentIntent) {
      uiAlert(t('pages.payment.alerts.createIntentFirst'));
      return;
    }

    setLoading(true);
    try {
      const sessionRequest = {
        payment_intent_id: paymentIntent.ID,
        success_url: `${window.location.origin}/wallet?payment=success`,
        cancel_url: `${window.location.origin}/payment?payment=canceled`,
        user_email: ''
      };

      const response = await paymentAPI.createPaymentSession(sessionRequest);
      
      // Stripe
      uiAlert(t('pages.payment.alerts.sessionCreated'));
      
      // 
      window.open(paymentAPI.getPaymentCheckoutUrl(response.session.StripeSessionID), '_blank');
      
    } catch (error: any) {
      uiAlert(`${t('pages.payment.alerts.createSessionFailedPrefix')}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number): string => {
    return (amount / 100).toFixed(2);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('pages.payment.title')}</h1>

        {walletOpsDisabled && (
          <div className="mb-4">
            <PAlert variant="warning" title={t('pages.payment.disabled.title')} message={t('pages.payment.disabled.message')} />
          </div>
        )}
        
        {/*  */}
        <PAlert variant="info" title={t('pages.payment.currentBalanceTitle')}>
          <p className="text-2xl font-bold">{formatAmount(balance)} {currency}</p>
        </PAlert>

        {/*  */}
        <form
          onSubmit={handleCreatePaymentIntent}
          className={`space-y-4 mb-6 ${walletOpsDisabled ? 'pointer-events-none opacity-50' : ''}`}
        >
          <div>
            <PInput
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0.01"
              label={t('pages.payment.form.amountLabel')}
              placeholder={t('pages.payment.form.amountPlaceholder')}
              required
            />
          </div>

          <div>
            <PSelect
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              label={t('pages.payment.form.currencyLabel')}
            >
              <option value="USD">{t('pages.payment.form.currencyOptions.usd')}</option>
              <option value="CNY">{t('pages.payment.form.currencyOptions.cny')}</option>
              <option value="EUR">{t('pages.payment.form.currencyOptions.eur')}</option>
            </PSelect>
          </div>

          <div>
            <PInput
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              label={t('pages.payment.form.noteLabel')}
              placeholder={t('pages.payment.form.notePlaceholder')}
            />
          </div>

          <PButton
            type="submit"
            disabled={walletOpsDisabled || !amount}
            loading={loading}
            fullWidth
          >
            {t('pages.payment.form.createIntentButton')}
          </PButton>
        </form>

        {/*  */}
        {paymentIntent && (
          <PAlert variant="success" title={t('pages.payment.intent.createdTitle')}>
            <div className="space-y-2 text-sm mb-4">
              <p><strong>{t('pages.payment.intent.id')}</strong> {paymentIntent.StripePaymentIntentID}</p>
              <p><strong>{t('pages.payment.intent.amount')}</strong> {formatAmount(paymentIntent.Amount)} {paymentIntent.Currency}</p>
              <p><strong>{t('pages.payment.intent.status')}</strong> <span className="text-orange-600">{paymentIntent.Status}</span></p>
              <p><strong>{t('pages.payment.intent.description')}</strong> {paymentIntent.Description}</p>
              <p><strong>{t('pages.payment.intent.createdAt')}</strong> {new Date(paymentIntent.CreatedAt).toLocaleString(locale)}</p>
            </div>
            <PButton
              onClick={handleCreatePaymentSession}
              loading={loading}
              disabled={walletOpsDisabled}
            >
              {t('pages.payment.intent.createSessionButton')}
            </PButton>
          </PAlert>
        )}

        {/* Stripe */}
        {stripeResponse && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('pages.payment.mockResponse.title')}
            </h3>
            <div className="space-y-2 text-sm">
              <p><strong>{t('pages.payment.mockResponse.requestUrl')}</strong> <code className="bg-gray-200 px-2 py-1 rounded">{stripeResponse.request_url}</code></p>
              <p><strong>{t('pages.payment.mockResponse.requestMethod')}</strong> <span className="text-blue-600">{stripeResponse.request_method}</span></p>
              <p><strong>{t('pages.payment.mockResponse.timestamp')}</strong> {new Date(stripeResponse.timestamp).toLocaleString(locale)}</p>
            </div>
            
            <details className="mt-4">
              <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                {t('pages.payment.mockResponse.viewDetails')}
              </summary>
              <pre className="mt-2 p-3 bg-gray-800 text-green-400 rounded text-xs overflow-x-auto">
                {JSON.stringify(stripeResponse, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/*  */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <PButton
            variant="ghost"
            onClick={() => navigate(ROUTES.user.wallet)}
          >
            {t('pages.payment.backToWallet')}
          </PButton>
        </div>
      </div>
    </div>
  );
};

export default Payment; 