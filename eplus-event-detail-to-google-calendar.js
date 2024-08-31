// ==UserScript==
// @name         eplus-event-detail-to-google-calendar
// @namespace    http://tampermonkey.net/
// @version      2024-08-28
// @description  e+の申込み詳細ページからGoogleカレンダーの予定作成ページへ飛ぶリンクを作成する
// @author       Lie.
// @match        https://orderhistory.eplus.jp/detail/*
// @match        https://eplus.jp
// @match        https://eplus.jp/*
// @match        https://*.eplus.jp
// @match        https://*.eplus.jp/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// @run-at       document_idle
// ==/UserScript==

const fullToHalf = (text) => {
    return encodeURIComponent(
        text.replace(/[\uFF01-\uFF5E]/g, str => {
            return String.fromCharCode(str.charCodeAt(0) - 0xFEE0)
        }).replaceAll('　', ' ')
    )
}

(() => {
    'use strict'

    const handleElement = (element) => {
        const div = element

        if (div.getAttribute('data-processed') === 'true') {
            return; // 既に処理済みの要素を再度処理しない
        }

        /*
        if(div.children[div.children.length - 1].children[0].tagName === 'A') {
            console.log('skip')
            return
        }
        */

        // 公演名
        const text = fullToHalf(div.children[0].innerText)

        // 日付
        const dates = ((text) => {
            const startDate = new Date(new Date(text.substring(0, text.indexOf('開場')).replaceAll('：', ':').replace(/\([月火水木金土日]\)/g, '')) - (-9 * 60 * 60 * 1000))
            const endDate   = new Date(startDate - (-4 * 60 * 60 * 1000))
            const startStr  = startDate.toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d\d\dZ/g, '')
            const   endStr  =   endDate.toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d\d\dZ/g, '')
            return `${startStr}/${endStr}`
        })(div.children[1].innerText)

        // 場所
        const locationFull = ((e) => {
            if(e.children[0] === undefined) {
                return e.innerText
            }

            if(e.children[0].tagName !== 'A') {
                return e.innerText
            }

            return e.children[0].innerText
        })(div.children[2])
        const location_ = fullToHalf(locationFull)

        // URL
        const url = `https://calendar.google.com/calendar/u/0/r/eventedit?text=${text}&location=${location_}&dates=${dates}`

        // ボタンをp要素に入れて追加
        const pElement = document.createElement('p')
        const aElement = document.createElement('a')
        aElement.id = 'ms02-btn-back'
        aElement.className = 'c-btn'
        aElement.href = url
        aElement.textContent = 'この公演をGoogleカレンダーに追加する'
        //aElement.target = '_blank'
        //aElement.rel = 'noopener'
        pElement.appendChild(aElement)
        div.appendChild(pElement)

        div.setAttribute('data-processed', 'true')  // 処理済みフラグを追加
    }

    const setupObserver = () => {
        const observer = new MutationObserver((mutations, obs) => {
            const div = document.querySelector('.m-ms02-info__content')
            if(div) {
                try {
                    handleElement(div)
                } catch(e) {
                    console.error(e.toString())
                }
                obs.disconnect() // 要素が見つかったのでオブザーバーを停止
            }
        })

        // bodyの変更を監視
        observer.observe(document.body, {
            childList: true,
            subtree: true
        })
    }

    setupObserver() // 初回のオブザーバー設定

    // history.pushStateとreplaceStateをフックして、ページ遷移後にオブザーバーを再設定
    const originalPushState = history.pushState
    history.pushState = function() {
        originalPushState.apply(this, arguments)
        setTimeout(setupObserver, 0)
    }

    const originalReplaceState = history.replaceState
    history.replaceState = function() {
        originalReplaceState.apply(this, arguments)
        setTimeout(setupObserver, 0)
    }

})()
