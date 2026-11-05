from pathlib import Path
p=Path('audit/check-local-http.mjs');s=p.read_text().replace("const cases=[", "const cases=[['razorpay-cancel-no-login','/api/payments/razorpay/cancel',{method:'POST'}],['razorpay-webhook-unconfigured','/api/payments/razorpay/webhook',{method:'POST'}],");p.write_text(s,encoding='utf-8')
