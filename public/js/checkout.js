const btn = document.querySelector('#btn');
const socket = io('wss://13.238.255.99:8080');

TPDirect.setupSDK(
    131331,
    'app_2LGMhUQWSeDu9VGQRjRodfpuFRGYTymAkZiQjf6h0idWNGV8DXWr1ZDrZJPU',
    'sandbox',
);
TPDirect.card.setup({
    fields: {
        number: {
            element: '.form-control.card-number',
            placeholder: '**** **** **** ****',
        },
        expirationDate: {
            element: document.getElementById('tappay-expiration-date'),
            placeholder: 'MM / YY',
        },
        ccv: {
            element: document.querySelector('.form-control.ccv'),
            placeholder: '後三碼',
        },
    },
    styles: {
        input: {
            color: 'gray',
        },
        'input.ccv': {
            // 'font-size': '16px'
        },
        ':focus': {
            color: 'black',
        },
        '.valid': {
            color: 'green',
        },
        '.invalid': {
            color: 'red',
        },
        '@media screen and (max-width: 400px)': {
            input: {
                color: 'orange',
            },
        },
    },
    // 此設定會顯示卡號輸入正確後，會顯示前六後四碼信用卡卡號
    isMaskCreditCardNumber: true,
    maskCreditCardNumberRange: {
        beginIndex: 6,
        endIndex: 11,
    },
});

TPDirect.card.onUpdate((update) => {
    if (update.canGetPrime) {
        btn.disabled = false;
    } else {
        btn.disabled = true;
    }

    if (update.status.number === 2) {
        setNumberFormGroupToError('.card-number-group');
    } else if (update.status.number === 0) {
        setNumberFormGroupToSuccess('.card-number-group');
    } else {
        setNumberFormGroupToNormal('.card-number-group');
    }

    if (update.status.expiry === 2) {
        setNumberFormGroupToError('.expiration-date-group');
    } else if (update.status.expiry === 0) {
        setNumberFormGroupToSuccess('.expiration-date-group');
    } else {
        setNumberFormGroupToNormal('.expiration-date-group');
    }

    if (update.status.ccv === 2) {
        setNumberFormGroupToError('.ccv-group');
    } else if (update.status.ccv === 0) {
        setNumberFormGroupToSuccess('.ccv-group');
    } else {
        setNumberFormGroupToNormal('.ccv-group');
    }
});

btn.addEventListener('click', (event) => {
    try {
        event.preventDefault();

        const form = document.querySelector('form');
        const id = document.querySelector('.id').textContent;
        const str = document.querySelector('.price').textContent;
        const message = document.querySelector('#message');
        const price = parseInt(str.match(/\d+/)[0], 10);
        const title = document.querySelector('.title').textContent;
        const colorCode = document.querySelector('.color-select');
        const colorName = document.querySelector('.color-select');
        const size = document.querySelector('.size-select').textContent;
        const qty = document.querySelector('#quantity').value;
        const name = colorCode.getAttribute('data-name');
        const code = colorName.getAttribute('data-value');

        const tapPayStatus = TPDirect.card.getTappayFieldsStatus();
        // Check TPDirect.card.getTapPayFieldsStatus().canGetPrime before TPDirect.card.getPrime
        if (tapPayStatus.canGetPrime === false) {
            alert('can not get prime');
            return;
        }

        // Get prime
        TPDirect.card.getPrime((result) => {
            if (result.status !== 0) {
                alert(`get prime error ${result.msg}`);
                return;
            }

            const { prime } = result.card;
            const formData = new FormData(form);

            const orderList = {
                prime,
                order: {
                    shipping: 'delivery',
                    payment: 'credit_card',
                    subtotal: price,
                    freight: 0,
                    total: price,
                    recipient: {
                        name: formData.get('name'),
                        phone: formData.get('phone'),
                        email: formData.get('email'),
                        address: formData.get('address'),
                        time: formData.get('time'),
                    },
                    list: [
                        {
                            id: parseInt(id, 10),
                            name: title,
                            price,
                            color: {
                                name,
                                code,
                            },
                            size,
                            qty,
                        },
                    ],
                },
            };

            fetch('/order/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderList),
            })
                .then((res) => res.json())
                .then((res) => {
                    if (res.status === 200) {
                        document.cookie = `order=${res.data.number}`;
                        socket.emit('update', { update: true });
                        window.location.assign('/thankyou.html');
                    } else if (res.status === 400) {
                        const currentUrl = window.location.href;
                        document.cookie = `returnUrl=${currentUrl}; path=/`;
                        window.location.assign('/user.html');
                    } else {
                        message.textContent = res.message;
                        message.style.display = 'block';
                    }
                });
        });
    } catch (err) {
        alert('請選擇顏色，尺寸，數量');
    }
});

function setNumberFormGroupToError(selector) {
    document.querySelector(selector).classList.add('has-error');
    document.querySelector(selector).classList.remove('has-success');
}

function setNumberFormGroupToSuccess(selector) {
    document.querySelector(selector).classList.remove('has-error');
    document.querySelector(selector).classList.add('has-success');
}

function setNumberFormGroupToNormal(selector) {
    document.querySelector(selector).classList.remove('has-error');
    document.querySelector(selector).classList.remove('has-success');
}
