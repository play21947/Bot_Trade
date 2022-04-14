const express = require('express')
const cors = require('cors')
const mysql = require('mysql2')
const app = express()
const crypto = require('crypto')
const axios = require('axios')
const { getTime } = require('date-fns')


const dbcon = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bot'
})


app.use(express.json())
app.use(cors())



const TS = () => {
    return new Promise((resolve, reject) => {
        axios.get("https://api.bitkub.com/api/servertime").then((res) => {
            resolve(res.data)
        })
    })
}

function signBody(body) {
    const digest = crypto.createHmac('sha256', '8d0cac54bd167c0eee0e3dce0d60b07a').update(JSON.stringify(body)).digest('hex');
    return digest;
}

const placeBid = (symbol, amount, rate, type) => { // BUY
    return new Promise(async (resolve, reject) => {
        try {
            let body = {
                sym: symbol,
                amt: amount, // THB no trailing zero 
                rat: rate, // for market order use 0
                typ: type,
                ts: Math.floor(getTime(new Date()) / 1000)
            };
            const signedBody = signBody(body);
            body.sig = signedBody;
            const response = await axios({
                method: 'post',
                url: 'https://api.bitkub.com/api/market/place-bid',
                headers: {
                    'Accept': 'application/json',
                    'Content-type': 'application/json',
                    'X-BTK-APIKEY': 'ab92d6af6744f46643072fb8bcd405a6'
                },
                data: body,
            }).then(res => res.data);;
            console.log('response', response);
        } catch (err) {
            reject(err);
        }
    });
}


const BotOn = async () => {


    let running = setInterval(async () => {
        let ADA_price = await axios.get('https://api.bitkub.com/api/market/ticker?sym=THB_ADA').then((res) => {
            return res.data.THB_ADA.last
        })


        dbcon.query("SELECT * FROM market", (err, rs) => {
            if (err) throw err

            let percent = rs[0].price_buy * 0.98
            console.log(percent)
            console.log(ADA_price)
            if (ADA_price <= percent) {
                console.log("BUY")
                clearInterval(running)
                // placeBid('THB_DOGE', 100, 4.5, "limit")
            }
        })
    }, 1000)


}

// BotOn()

// Do This More then Comeback
const Test = async () => {
    let running = setInterval(() => {
        dbcon.query("SELECT * FROM market", (err, rs) => {
            if (err) throw err

            rs.map((item, index) => {
                // console.log("Buy : ", item.email_holder, item.sym_coin, item.buy_point)
                axios.get("https://api.bitkub.com/api/market/ticker?sym=" + item.sym_coin).then((res) => {
                    let cvt = Object.entries(res.data)
                    let last_price = cvt[0][1].last
                    let sym = cvt[0][0]
                    if (item.tradable === 1) {
                        if (item.bought !== 1) {
                            console.log(item.bought)
                            console.log(last_price, ' : ', item.buy_point)
                            if (last_price <= item.buy_point) {

                                console.log('buy')

                                dbcon.query("UPDATE market SET bought = ? WHERE email_holder = ? AND sym_coin = ?", [1, rs[0].email_holder, rs[0].sym_coin], (err, rs) => {
                                    if (err) throw err

                                    console.log('Success')
                                })

                            } else {
                                console.log("Do nothing")
                            }
                        } else {
                            console.log("You bought it already")
                        }
                    }
                })
            })
        })
    }, 2000)
}


// Test()


// const getAllCoin = (coin) => {
//     return new Promise((resolve, reject) => {
//         try {
//             axios.get('https://api.bitkub.com/api/market/ticker?sym='+coin, {
//                 headers: {
//                     'Cache-Control': 'no-cache'
//                 }
//             }).then((res) => {
//                 resolve(res.data)
//             })
//         } catch (err) {
//             reject(err)
//         }
//     })
// }



const Trade = () => {

    setInterval(() => {
        axios.get('https://api.bitkub.com/api/market/ticker?sym=THB_DOGE', {
            headers: {
                'Cache-Control': 'no-cache'
            }
        }).then((res) => {
            // console.log(res.data.THB_DOGE.last)
            dbcon.query("SELECT * FROM market WHERE email = ? AND sym_coin = ?", ['play21947@gmail.com', 'THB_DOGE'], (err, rs) => {
                if (err) throw err
        
                let percent = res.data.THB_DOGE.last / (rs[0].total_money / rs[0].total_coin)
        
                let result
        
                if (percent < 0) {
                    result = (percent - 1) * 100
                } else {
                    result = (percent * 100) - 100
                }

                console.log(result)

                // console.log(rs[0].c1)
                // console.log(rs[0].c2)
                // console.log(rs[0].c3)


                if(result >= rs[0].take_profit){ // Sell
                    if(rs[0].status_sell == 0){
                        console.log("Sell!")
                        dbcon.query("UPDATE market SET status_sell = ? WHERE email = ? AND sym_coin = ?", [1, 'play21947@gmail.com', 'THB_DOGE'], (err, rs)=>{
                            if(err) throw err
    
                            console.log("Sell Updated")
                        })
                    }
                }





                if(rs[0].s1 == 0){
                    if(result <= rs[0].c1 && result > rs[0].c2){ // Buy 1

                        let price_buy = Math.abs(((result / 100) - 1) * res.data.THB_DOGE.last)
    
                        console.log(price_buy)
    
                        placeBid('THB_DOGE', (rs[0].investor_money * rs[0].v1), price_buy, "limit")

                        console.log("Buy Doge : ", price_buy)
    
                        dbcon.query("UPDATE market SET s1 = ? WHERE email = ? AND sym_coin = ?", [1, 'play21947@gmail.com', 'THB_DOGE'], (err, rs)=>{
                            if(err) throw err
    
                            console.log("Updated C1")
                        })
    
                    }
    
                }


                if(rs[0].s2 == 0){
                    if(result <= rs[0].c2 && result > rs[0].c3){

                        let price_buy = Math.abs(((result / 100) - 1) * res.data.THB_DOGE.last)
    
                        console.log(price_buy)
    
                        placeBid('THB_DOGE', (rs[0].investor_money * rs[0].v2), price_buy, "limit")

                        console.log("Buy Doge : ", price_buy)
    
                        dbcon.query("UPDATE market SET s2 = ? WHERE email = ? AND sym_coin = ?", [1 ,'play21947@gmail.com', 'THB_DOGE'], (err, rs)=>{
                            if(err) throw err
    
                            console.log("Updated c2")
                        })
    
                        console.log("Buy C2")
                    }
                }


                if(result <= rs[0].c3 && result > -100){
                    let price_buy = Math.abs(((result / 100) - 1) * res.data.THB_DOGE.last)
    
                    console.log(price_buy)

                    placeBid('THB_DOGE', (rs[0].investor_money * rs[0].v3), price_buy, "limit")

                    console.log("Buy Doge : ", price_buy)

                    dbcon.query("UPDATE market SET s3 = ? WHERE email = ? AND sym_coin = ?", [1 ,'play21947@gmail.com', 'THB_DOGE'], (err, rs)=>{
                        if(err) throw err

                        console.log("Updated c3")
                    })

                    console.log("Buy C3")
                }
        
            })
        })
    }, 1000)

    // dbcon.query("SELECT * FROM market WHERE email = ? AND sym_coin = ?", ['play21947@gmail.com', 'THB_DOGE'], (err, rs) => {
    //     if (err) throw err

    //     let percent = coin[0][1].last / (rs[0].total_money / rs[0].total_coin)

    //     let result

    //     if (percent < 0) {
    //         result = (percent - 1) * 100
    //     } else {
    //         result = (percent * 100) - 100
    //     }

    // })
}

Trade()





// app.get('/cors', (req, res)=>{
//     res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
//     res.json("Cors is enabling")
// })

app.get('/test', (req, res) => {
    res.json({ status: true })
})


app.post('/user', async (req, res) => {

    let email = req.body.email

    let ts = await TS()

    dbcon.query("SELECT * FROM users WHERE email = ?", [email], (err, rs) => {
        if (err) throw err

        let sig = crypto.createHmac('sha256', rs[0].secret_key).update(JSON.stringify({ ts: ts })).digest('hex')

        res.json({ rs, signature: sig })
    })
})


app.post('/SignIn', (req, res) => {
    let email = req.body.email
    let password = req.body.password


    dbcon.query("SELECT * FROM users WHERE email = ? AND password = ?", [email, password], (err, rs) => {
        if (err) throw err


        console.log(rs.length)
        if (rs.length > 0) {
            res.json({ success: true })
        } else {
            res.json({ success: false })
        }
    })

})


app.post('/key', async (req, res) => {
    let apikey = req.body.apikey
    let secretkey = req.body.secretkey


    let ts = await TS()


    dbcon.query("UPDATE users SET api_key = ?, secret_key = ?", [apikey, secretkey], (err, rs) => {
        if (err) throw err

        res.json({ success: true })
    })
})

// app.post('/signature', (req, res)=>{

//     let email = req.body.email

//     dbcon.query("SELECT * FROM users WHERE email = ?", [email], (err, rs)=>{
//         if(err) throw err

//         console.log(rs[0].secretkey)
//     })
// })


app.post('/api_btk', async (req, res) => {

    let email = req.body.email

    let time = await axios.get('https://api.bitkub.com/api/servertime')


    dbcon.query("SELECT * FROM users WHERE email = ?", [email], (err, rs) => {
        if (err) throw err

        if (rs.length > 0) {
            let sig = crypto.createHmac('sha256', rs[0].secret_key).update(JSON.stringify({ ts: time.data })).digest('hex')

            if (sig) {
                axios.post('https://api.bitkub.com/api/market/wallet', {
                    ts: time.data,
                    sig: sig
                }, {
                    headers: {
                        'X-BTK-APIKEY': rs[0].api_key
                    }
                }).then((result) => {
                    res.json(result.data)
                })
            }
        }
    })

})


app.post('/update_market', (req, res) => {

    // percent_buy: percent_buy,
    // buy_point: buy_point,
    // percent_sell: percent_sell,
    // sell_point: sell_point

    let sym_coin = req.body.sym_coin
    let email = req.body.email
    let money = req.body.money
    let last_coin = req.body.last_coin
    let percent_buy = req.body.percent_buy
    let buy_point = req.body.buy_point
    let percent_sell = req.body.percent_sell
    let sell_point = req.body.sell_point


    console.log(percent_buy)


    dbcon.query("SELECT * FROM market WHERE sym_coin = ? AND email_holder = ?", [sym_coin, email], (err, rs) => {
        if (err) throw err

        console.log(rs.length)

        if (rs.length > 0) {
            dbcon.query("UPDATE market SET investor_money = ?, price_buy = ?, percent_buy = ?, buy_point = ?, percent_sell = ?, sell_point = ? WHERE sym_coin = ? AND email_holder = ?", [money, last_coin, percent_buy, buy_point, percent_sell, sell_point, sym_coin, email], (err, rs) => {
                if (err) throw err


                res.json({ success: true })
            })
        } else {
            dbcon.query("INSERT INTO market (email_holder, sym_coin, investor_money, price_buy, percent_buy, buy_point, percent_sell, sell_point) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [email, sym_coin, money, last_coin, percent_buy, buy_point, percent_sell, sell_point], (err, rs) => {
                if (err) throw err


                res.json({ success: true })
            })
        }
    })

    // dbcon.query("UPDATE market SET ")
})


app.post('/trade', (req, res) => {

    let email = req.body.email

    dbcon.query("SELECT * FROM market WHERE tradable = ? AND email = ?", [1, email], (err, rs) => {
        if (err) throw err

        res.json(rs)
    })
})


app.listen(3001, () => {
    console.log('server is running on port 3001')
})