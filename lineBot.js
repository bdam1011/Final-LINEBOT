'use strict';
const
    config = require('config'),
    express = require('express');
const axios = require('axios');
const line = require('@line/bot-sdk');

var app = express();
var port = process.env.PORT || process.env.port || 5000;
app.set('port', port);
app.use(express.json());

app.listen(app.get('port'), function () {
    console.log('[app.listen]Node app is running on port', app.get('port'));
});

module.exports = app;

// create LINE SDK client
const client = new line.Client({
    channelAccessToken: config.get("channelAccessToken"),
    channelSecret: config.get("channelSecret")
});

//var jwt = "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJvbmVAZ21haWwuY29tIiwiaWF0IjoxNjQzNjEwNjQ2LCJleHAiOjE2NDM2MTU0NDZ9.FkKVxbaHCmHSeOs769iom4fX5mQSGgJBCUV3WXZHLJSvTaHhnp1-Ds9kk1URJ0N0oqjgDyKq5fAnRJqMKKiSaA";
var jwt = "";
app.post('/webhook', function (req, res) {
    console.log("[webhook] in");
    //處理Dialogflow送過來的內容
    var data = req.body;
    console.log(data);

    var userSourceId = data.events[0].source.userId;
    var replyToken = data.events[0].replyToken;
    var eventType = data.events[0].type;
    console.log(eventType);
    var city = ["臺北市", "台北市", "台北", "臺北", "新北市", "新北", "桃園市", "桃園", "臺中市", "台中市", "台中", "臺中", "臺南市", "台南市", "台南", "臺南", "高雄市", "高雄", "新竹縣", "新竹", "苗栗縣", "苗栗", "彰化縣", "彰化", "南投縣", "南投", "雲林縣", "雲林", "嘉義縣", "嘉義", "屏東縣", "屏東", "宜蘭縣", "宜蘭", "花蓮縣", "花蓮", "臺東縣", "台東縣", "台東", "臺東", "澎湖縣", "澎湖", "金門縣", "金門", "連江縣", "連江", "馬祖", "基隆市", "基隆", "新竹市", "嘉義市"];

    lineLogin(userSourceId)
        .then((response) => {
            switch (eventType) {
                case "message": case "message":
                    let message = data.events[0].message.text;
                    if (message == "我的行程") {
                        //回傳自己的行程
                        axios.get('http://localhost:8080/foodmap/wts/myself', {
                            headers: {
                                'Authorization': `Bearer ${jwt}`
                            }
                            // params: {
                            //     "WTtitle": queryLocation
                            // }
                        })
                            .then((res) => {
                                if (res.data.length > 0) {
                                    return client.replyMessage(replyToken,
                                        [{
                                            "type": "flex",
                                            "altText": "This is a Flex Message",
                                            "contents": {
                                                "type": "carousel",
                                                "contents": sendtTravelCards(res)
                                            }
                                        }
                                        ]
                                    );
                                }
                                return client.replyMessage(replyToken,
                                    {
                                        "type": "text",
                                        "text": `您還沒登錄成我們的會員或建立自己的計畫，快到Plan me建立自己的計劃吧~`
                                    }
                                );
                            })
                            .catch((error) => {
                                console.error(error);
                            })
                        break;
                    }
                    //問要那裡的行程
                    if (message == "地點行程") {
                        return client.replyMessage(replyToken,
                            {
                                "type": "text",
                                "text": "可以給我你想要的去玩的城市嗎?"
                            }
                        );
                    }
                    //依據地點給行程
                    if (city.includes(message)) {
                        axios.get('http://localhost:8080/foodmap/wts/multi', {
                            headers: {
                                'Authorization': `Bearer ${jwt}`
                            },
                            params: {
                                "WTtitle": message
                            }
                        })
                            .then((res) => {
                                if (res.data.length > 0) {
                                    return client.replyMessage(replyToken,
                                        [{
                                            "type": "flex",
                                            "altText": "This is a Flex Message",
                                            "contents": {
                                                "type": "carousel",
                                                "contents": sendtTravelCards(res)
                                            }
                                        }
                                        ]
                                    );
                                }
                                return client.replyMessage(replyToken,
                                    {
                                        "type": "text",
                                        "text": `您搜尋包含${message}的旅程尚不存在，請到Plan me進行新增`
                                    }
                                );
                            })
                            .catch((error) => {
                                console.log(error);

                            })

                        break;
                    }
                case "location":

                    let latitude = data.events[0].message.latitude;
                    let longitude = data.events[0].message.longitude;

                    axios.get(`http://localhost:8080/foodmap/map/${latitude}/${longitude}`, {
                        headers: {
                            'Authorization': `Bearer ${jwt}`
                        }
                    })
                        .then((res) => {
                            console.log(res.data);
                            if (res.data.length > 0) {
                                return client.replyMessage(replyToken,
                                    [{
                                        "type": "flex",
                                        "altText": "This is a Flex Message",
                                        "contents": {
                                            "type": "carousel",
                                            "contents": sendAttractionsCard(res)
                                        }

                                    }]
                                );
                            }
                            return client.replyMessage(replyToken,
                                {
                                    "type": "text",
                                    "text": "糟糕，附近沒找到好吃的~ㄜ...或許你可以考慮便利商店"
                                }
                            );
                        })
                        .catch((error) => {
                            console.error(error);
                        })

                    break;
                case "postback":
                    if (data.events[0].postback.data.includes("wtid")) {
                        var wtid = data.events[0].postback.data.substring(4);
                        axios.get(`http://localhost:8080/foodmap/wts/${wtid}`, {
                            headers: {
                                'Authorization': `Bearer ${jwt}`
                            }
                        })
                            .then((res) => {
                                console.log(res.data);
                                if (res.data.dayTravelBeans.length > 0) {
                                    return client.replyMessage(replyToken,
                                        [{
                                            "type": "flex",
                                            "altText": "This is a Flex Message",
                                            "contents": {
                                                "type": "carousel",
                                                "contents": sendDayPlan(res)
                                            }

                                        }]
                                    );
                                }
                                return client.replyMessage(replyToken,
                                    {
                                        "type": "text",
                                        "text": `您搜尋的行程尚未創建完整，請到Plan me進行新增`
                                    }
                                );
                            })
                            .catch((error) => {
                                console.log(error);
                            })

                    }

                    if (data.events[0].postback.data.includes("dtid")) {
                        var dtid = data.events[0].postback.data.substring(4);
                        axios.get(`http://localhost:8080/foodmap/dts/${dtid}`, {
                            headers: {
                                'Authorization': `Bearer ${jwt}`
                            }
                        })
                            .then((res) => {
                                console.log(res.data);

                                if (res.data.travelUnitBeans.length > 0) {

                                    return client.replyMessage(replyToken,
                                        [{
                                            "type": "flex",
                                            "altText": "This is a Flex Message",
                                            "contents": {
                                                "type": "carousel",
                                                "contents": sendUnit(res)
                                            }

                                        }]
                                    );
                                }
                                return client.replyMessage(replyToken,
                                    {
                                        "type": "text",
                                        "text": `您搜尋的行程尚未創建完整，請到Plan me進行新增`
                                    }
                                );
                            })
                            .catch((error) => {
                                console.log(error);
                            })
                    }
                    break;

                default:
                    break;
            }
        })
        .catch((error) => {
            console.error(error);
        })


});


async function lineLogin(userSourceId) {
    var name;
    var userId;

    await client.getProfile(userSourceId)
        .then((profile) => {
            name = profile.displayName;
            console.log(name);
            userId = profile.userId;
            console.log(userId);

        })
        .catch((err) => {
            console.log(err);
        });

    return axios({
        method: "post",
        url: 'http://localhost:8080/auth/login/signin',
        //API要求的資料
        data: {
            "usernameOrEmail": name,
            "password": userId
        }
    })
        .then((response) => {
            jwt = response.data.accessToken;
        }).catch((err) => {
            console.log(err)
        })

}

function getDayOfWeek(date) {
    const dayOfWeek = new Date(date).getDay() - 1;
    if (dayOfWeek < 0) {
        dayOfWeek = 6;
    }
    return dayOfWeek;
    // return isNaN(dayOfWeek) ? null : 
    //   ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
}

function sendtTravelCards(res) {
    var contents = [];
    for (let i = 0; i < res.data.length; i++) {
        var wtid = res.data[i].wtid;
        var wttitle = res.data[i].wttitle;
        var wtphoto = res.data[i].wtphoto;
        var wtlike = res.data[i].wtlike;
        var wtstartT = res.data[i].wtstartT;
        var viewDetail = "詳細資訊請在Plan Me進行查詢";
        if (res.data[i].dayTravelBeans.length > 0) {

        }

        var bubble = {
            "type": "bubble",
            "size": "mega",
            "hero": {
                "type": "image",
                "url": wtphoto,
                "size": "full",
                "aspectMode": "cover",
                "aspectRatio": "320:213"
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": wttitle,
                        "weight": "bold",
                        "size": "xl",
                        "wrap": true
                    },
                    {
                        "type": "box",
                        "layout": "baseline",
                        "contents": [
                            {
                                "type": "icon",
                                "size": "lg",
                                "url": "https://w7.pngwing.com/pngs/518/598/png-transparent-heart-scalable-graphics-icon-a-red-heart-love-text-heart.png"
                            },
                            {
                                "type": "text",
                                "text": "" + wtlike,
                                "size": "lg",
                                "color": "#8c8c8c",
                                "margin": "md",
                                "flex": 0
                            }
                        ]
                    },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "text",
                                "size": "lg",
                                "text": wtstartT
                            }
                        ]
                    }
                ],
                "spacing": "sm",
                "paddingAll": "13px"
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "button",
                        "action": {
                            "type": "postback",
                            "label": "View Detail",
                            "data": "wtid" + wtid,
                            "displayText": "正在為您搜尋詳細資料"
                        }
                    }
                ]
            }
        }
        contents.push(bubble);
    };
    return contents;
};

function sendAttractionsCard(response) {
    var contents = [];
    for (let i = 0; i < 12; i++) {


        try {
            var address = response.data[i].formattedAddress || "address";
            var phoneNumber = response.data[i].formattedPhoneNumber || "phoneNumber";
            var placeName = response.data[i].name || "placeName";
            var url = response.data[i].url || "url";
            var rating = response.data[i].rating || "rating";
            var openNow = response.data[i].openingHours.openNow || false;
            var openingHours = response.data[i].openingHours.weekdayText[getDayOfWeek(new Date())] || "openingHours";

            var openTime = "";
            if (openNow) {
                openTime = openingHours;
            } else {
                openTime = "The shop is now closed";
            }
            var photo = "";
            let photoReference = response.data[i].photos[0].photoReference;
            photo = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${config.get("google_api_key")}`;
        } catch (e) {
            console.log(i + "  " + e);
            photo = "https://i1.kknews.cc/ng-sdB_Qs-nOKi8Ij28dmZSlhM9aCcVEg91NvJM/0.jpg";
            openTime = "please view this in detail"
        }


        var bubble = {
            "type": "bubble",
            "size": "kilo",
            "hero": {
                "type": "image",
                "url": photo,
                "size": "full",
                "aspectRatio": "20:13",
                "aspectMode": "cover",
                "action": {
                    "type": "uri",
                    "uri": photo
                }
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": placeName,
                        "weight": "bold",
                        "size": "xl"
                    },
                    {
                        "type": "box",
                        "layout": "baseline",
                        "margin": "md",
                        "contents": [
                            {
                                "type": "icon",
                                "size": "md",
                                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
                            },
                            {
                                "type": "text",
                                "text": "" + rating,
                                "size": "md",
                                "color": "#999999",
                                "margin": "md",
                                "flex": 0
                            }
                        ]
                    },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "margin": "lg",
                        "spacing": "sm",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "baseline",
                                "spacing": "sm",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": "Place",
                                        "color": "#aaaaaa",
                                        "size": "sm",
                                        "flex": 1,
                                        "contents": []
                                    }
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": address,
                                        "wrap": true,
                                        "color": "#666666",
                                        "size": "sm",
                                        "flex": 5
                                    }
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "baseline",
                                "spacing": "sm",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": "Time",
                                        "color": "#aaaaaa",
                                        "size": "sm",
                                        "flex": 1
                                    },
                                    {
                                        "type": "text",
                                        "text": "10:00 - 23:00",
                                        "wrap": true,
                                        "color": "#666666",
                                        "size": "sm",
                                        "flex": 5
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "spacing": "sm",
                "contents": [
                    {
                        "type": "button",
                        "style": "link",
                        "height": "sm",
                        "action": {
                            "type": "message",
                            "label": "Phone",
                            "text": phoneNumber
                        }
                    },
                    {
                        "type": "button",
                        "style": "link",
                        "height": "sm",
                        "action": {
                            "type": "uri",
                            "label": "WEBSITE",
                            "uri": url
                        }
                    }
                ],
                "flex": 0
            }
        }
        contents.push(bubble);
    }
    return contents;
};

function sendDayPlan(res) {
    var contents = [];

    for (let i = 0; i < res.data.dayTravelBeans.length; i++) {
        var dayTravelBean = res.data.dayTravelBeans[i];
        var dtid = dayTravelBean.dtid;
        var dttitle = dayTravelBean.dttitle;
        var dtintroduce = dayTravelBean.dtintroduce;
        var dtbegin = dayTravelBean.dtbegin;

        var bubble = {
            "type": "bubble",
            "size": "mega",
            "header": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": dttitle,
                        "color": "#ffffff",
                        "align": "start",
                        "size": "lg",
                        "gravity": "center"
                    }
                ],
                "backgroundColor": "#00CED1",
                "paddingTop": "19px",
                "paddingAll": "12px",
                "paddingBottom": "16px"
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                            {
                                "type": "text",
                                "text": "行程介紹:\n" + dtintroduce,
                                "color": "#8C8C8C",
                                "size": "md",
                                "wrap": true
                            }
                        ],
                        "flex": 1
                    }
                ],
                "spacing": "md",
                "paddingAll": "12px"
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "button",
                        "action": {
                            "type": "postback",
                            "label": "View Attractions",
                            "data": "dtid" + dtid,
                            "displayText": "正在為您搜尋景點資料"
                        }
                    }
                ]
            },
            "styles": {
                "footer": {
                    "separator": false
                }
            }
        }
        contents.push(bubble);
    }

    return contents;
}

function sendUnit(res) {
    var contents = [];

    for (let i = 0; i < res.data.travelUnitBeans.length; i++) {

        var attractionsBean = res.data.travelUnitBeans[i].attractionsBean;
        var atrname = attractionsBean.atrname;
        var atrintroduce = attractionsBean.atrintroduce;
        var atraddress = attractionsBean.atraddress;
        var atropentime = attractionsBean.atropentime;
        var atrtel = attractionsBean.atrtel;
        var atrlike = attractionsBean.atrlike;
        var atrphotoBeans = attractionsBean.atrphotoBeans[0].photo;
        var bubble = {
            "type": "bubble",
            "size": "mega",
            "hero": {
                "type": "image",
                "url": atrphotoBeans,
                "size": "full",
                "aspectRatio": "20:13",
                "aspectMode": "cover",
                "action": {
                    "type": "uri",
                    "uri": atrphotoBeans
                }
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": atrname,
                        "weight": "bold",
                        "size": "xl"
                    },
                    {
                        "type": "box",
                        "layout": "baseline",
                        "margin": "md",
                        "contents": [
                            {
                                "type": "icon",
                                "size": "md",
                                "url": "https://w7.pngwing.com/pngs/518/598/png-transparent-heart-scalable-graphics-icon-a-red-heart-love-text-heart.png"
                            },
                            {
                                "type": "text",
                                "text": "" + atrlike,
                                "size": "md",
                                "color": "#999999",
                                "margin": "md",
                                "flex": 0
                            }
                        ]
                    },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "margin": "lg",
                        "spacing": "sm",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "baseline",
                                "spacing": "sm",
                                "contents": [
                                    // {
                                    //     "type": "text",
                                    //     "text": "Info",
                                    //     "color": "#aaaaaa",
                                    //     "size": "md",
                                    //     "flex": 1,
                                    //     "contents": []
                                    // },
                                    {
                                        "type": "text",
                                        "text": atrintroduce,
                                        "wrap": true,
                                        "color": "#666666",
                                        "size": "md",
                                        "flex": 10
                                    }
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "baseline",
                                "spacing": "sm",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": "Place",
                                        "color": "#aaaaaa",
                                        "size": "md",
                                        "flex": 1,
                                        "contents": []
                                    },
                                    {
                                        "type": "text",
                                        "text": atraddress,
                                        "wrap": true,
                                        "color": "#666666",
                                        "size": "md",
                                        "flex": 5
                                    }
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "baseline",
                                "spacing": "sm",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": "Time",
                                        "color": "#aaaaaa",
                                        "size": "md",
                                        "flex": 1
                                    },
                                    {
                                        "type": "text",
                                        "text": atropentime,
                                        "wrap": true,
                                        "color": "#666666",
                                        "size": "md",
                                        "flex": 5
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
            // "footer": {
            //     "type": "box",
            //     "layout": "vertical",
            //     "spacing": "sm",
            //     "contents": [
            //         {
            //             "type": "button",
            //             "style": "link",
            //             "height": "sm",
            //             "action": {
            //                 "type": "message",
            //                 "label": "Phone",
            //                 "text": atrtel
            //             }
            //         }
            //     ],
            //     "flex": 0
            // }
        }
        contents.push(bubble);
    }
    return contents;
}






