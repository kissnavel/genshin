// 原神、星铁米游社面板代码来源：https://github.com/thisee/xiaokeli，已修改适配本仓库
// 2024-10-18 目前只写了原神和星铁的4星5星圣遗物(遗器)识别
import fs from 'node:fs'

export default class Myspanel {

    /*原神*/
    static async gs_mys(data, uid) {
        let avatars = {}
        this.property_map = data.data.property_map

        let path = `./data/PlayerData/gs/${uid}.json`
        let mb = {
            'uid': `${uid}`,
            'avatars': {}
        }

        if (fs.existsSync(path)) {
            mb = JSON.parse(fs.readFileSync(path, 'utf8'))
        }

        data.data.list.map((v) => {
            var va = v.base
            //promote
            let pro
            if (va.level > 80) pro = 6
            else if (va.level > 70) pro = 5
            else if (va.level > 60) pro = 4
            else if (va.level > 50) pro = 3
            else if (va.level > 40) pro = 2
            else if (va.level > 20) pro = 1
            else if (va.level > 0) pro = 0
            //命座影响天赋
            let ava
            try {
                ava = JSON.parse(fs.readFileSync(`./plugins/miao-plugin/resources/meta-gs/character/${va.name}/data.json`, 'utf-8'))
            } catch (e) {
                return 
            }
            let n
            let a = v.skills[0].level
            let e = v.skills[1].level
            let q = v.skills[2].level
            //绫华，莫娜
            if (va.id == '10000002' || va.id == '10000041') q = v.skills[3].level
            if (va.actived_constellation_num > 4) {
                n = Object.values(ava.talentCons).indexOf(5)
                switch (Object.keys(ava.talentCons)[n]) {
                    case 'a':
                        a = a - 3
                        break
                    case 'e':
                        e = e - 3
                        break
                    case 'q':
                        q = q - 3
                        break
                    default:
                }
            }
            if (va.actived_constellation_num > 2) {
                n = Object.values(ava.talentCons).indexOf(3)
                switch (Object.keys(ava.talentCons)[n]) {
                    case 'a':
                        a = a - 3
                        break
                    case 'e':
                        e = e - 3
                        break
                    case 'q':
                        q = q - 3
                        break
                    default:
                }
            }
            //处理达达鸭天赋
            if (va.id == '10000033') a--
            //处理旅行者
            if (va.id == '10000005') va.name = '空'
            if (va.id == '10000007') va.name = '荧'
            //皮肤
            let costume = 0
            if (mb.avatars[va.id]?.costume) costume = mb.avatars[va.id].costume

            avatars[va.id] = {
                'name': va.name,
                'id': va.id,
                'elem': va.element.toLowerCase(), //小写
                'level': va.level,
                'promote': pro,
                'fetter': va.fetter,
                'costume': costume,
                'cons': va.actived_constellation_num,
                'talent': {
                    'a': a,
                    'e': e,
                    'q': q
                },
                'weapon': {
                    'name': v.weapon.name,
                    'level': v.weapon.level,
                    'promote': v.weapon.promote_level,
                    'affix': v.weapon.affix_level
                },
                '_source': 'mysPanel',
                '_time': new Date().getTime(),
                '_update': new Date().getTime(),
                '_talent': new Date().getTime(),
            }
            let relics = {}
            if (v.relics.length) {
                //mainld_lists
                let list1 = {
                    '生命值百分比': 10002,
                    '元素充能效率': 10007,
                    '攻击力百分比': 10004,
                    '防御力百分比': 10006,
                    '元素精通': 10008
                }
                let list2 = {
                    '生命值百分比': 15002,
                    '攻击力百分比': 15004,
                    '防御力百分比': 15006,
                    '元素精通': 15007,
                    '物理伤害加成': 15015,
                    '冰元素伤害加成': 15010,
                    '岩元素伤害加成': 15013,
                    '火元素伤害加成': 15008,
                    '水元素伤害加成': 15011,
                    '风元素伤害加成': 15012,
                    '雷元素伤害加成': 15009,
                    '草元素伤害加成': 15014
                }

                let list3 = {
                    '生命值百分比': 13002,
                    '攻击力百分比': 13004,
                    '防御力百分比': 13006,
                    '元素精通': 13010,
                    '暴击率': 13007,
                    '暴击伤害': 13008,
                    '治疗加成': 13009
                }
                //attrIds[attrId,value最低位，平均差值] 5星
                let attrIds = {
                    '暴击伤害': ['501221', '0.0544', '0.00768'],
                    '暴击率': ['501201', '0.0272', '0.00378'],
                    '攻击力百分比': ['501061', '0.0408', '0.00579'],
                    '生命值百分比': ['501031', '0.0408', '0.00579'],
                    '防御力百分比': ['501091', '0.0510', '0.00729'],
                    '生命值': ['501021', '209.13', '29.85'],
                    '攻击力': ['501051', '13.62', '1.93'],
                    '防御力': ['501081', '16.20', '2.31'],
                    '元素精通': ['501241', '16.32', '2.325'],
                    '元素充能效率': ['501231', '0.0453', '0.00645']
                }
                //屎山代码了,逆推attrIds
                for (var val of v.relics) {
                    if (val.rarity > 3) {
                        //仅支持4星 5星圣遗物
                        if (val.rarity == 4) {
                            //attrIds[attrId,value最低位，平均差值] 4星
                            attrIds = {
                                '暴击伤害': ['401221', ' 0.043499', '0.00619'],
                                '暴击率': ['401201', '0.0218', '0.00305'],
                                '攻击力百分比': ['401061', '0.0326', '0.0046'],
                                '生命值百分比': ['401031', '0.0326', '0.0046'],
                                '防御力百分比': ['401091', '0.0408', '0.00579'],
                                '生命值': ['401021', '167.3', '23.89'],
                                '攻击力': ['401051', '10.89', '1.5'],
                                '防御力': ['401081', ' 12.96', '1.848'],
                                '元素精通': ['401241', '13.06', '1.85'],
                                '元素充能效率': ['401231', '0.03629', '0.0051']
                            }
                        }
                        val.attrIds = []
                        for (var t = 0; t < val.sub_property_list.length; t++) {
                            if (val.sub_property_list[t]) {
                                let val_ = val.sub_property_list[t]
                                let at = attrIds[this.property_map[val_.property_type].filter_name]
                                let k
                                let p = 0
                                let b = 0
                                let times = val_.times + 1
                                //去% ％
                                if (val_.value.includes('%', '％')) {
                                    val_.value = Number(val_.value.replace(/%|％/g, '').trim()) / 100
                                } else {
                                    val_.value = Number(val_.value)
                                }
                                //利用勾股定理，乘法口诀表，心算，氢氦锂铍硼，重力势能转换，生物链等等原理，逆推attrIds，反正狗屎代码
                                if (val_.value - Number(at[1]) * times <= 0) {
                                    k = 0
                                } else {
                                    k = (val_.value - Number(at[1]) * times) / Number(at[2])
                                    if (k.toString().indexOf('.') !== -1) {
                                        b = Math.floor((k - Math.floor(k)) * 100)
                                        if (b > 50) k = Math.ceil(k)
                                        else k = Math.floor(k)
                                    }
                                    p = k % times
                                }
                                if (k >= times * 3) {
                                    for (var i = 0; i < times; i++) {
                                        val.attrIds.push(Number(at[0]) + 3)
                                    }
                                } else if (k >= times * 2) {
                                    for (var i = 0; i < times - p; i++) {
                                        val.attrIds.push(Number(at[0]) + 2)
                                    }
                                    for (var g = 0; g < p; g++) {
                                        val.attrIds.push(Number(at[0]) + 3)
                                    }
                                } else if (k >= times) {
                                    for (var i = 0; i < times - p; i++) {
                                        val.attrIds.push(Number(at[0]) + 1)
                                    }
                                    for (var g = 0; g < p; g++) {
                                        val.attrIds.push(Number(at[0]) + 2)
                                    }
                                } else if (k >= 0) {
                                    for (var i = 0; i < times - k; i++) {
                                        val.attrIds.push(Number(at[0]))
                                    }
                                    for (var i = 0; i < k; i++) {
                                        val.attrIds.push(Number(at[0]) + 1)
                                    }
                                }
                            }
                        }
                        switch (val.pos_name) {
                            case '生之花':
                                relics['1'] = {
                                    'level': val.level,
                                    'name': val.name,
                                    'star': val.rarity,
                                    'mainId': 14001,
                                    'attrIds': val.attrIds,
                                }
                                break
                            case '死之羽':
                                relics['2'] = {
                                    'level': val.level,
                                    'name': val.name,
                                    'star': val.rarity,
                                    'mainId': 12001,
                                    'attrIds': val.attrIds
                                }
                                break
                            case '时之沙':
                                relics['3'] = {
                                    'level': val.level,
                                    'name': val.name,
                                    'star': val.rarity,
                                    'mainId': list1[this.property_map[val.main_property.property_type].filter_name],
                                    'attrIds': val.attrIds,
                                }
                                break
                            case '空之杯':
                                relics['4'] = {
                                    'level': val.level,
                                    'name': val.name,
                                    'star': val.rarity,
                                    'mainId': list2[this.property_map[val.main_property.property_type].filter_name],
                                    'attrIds': val.attrIds,
                                }
                                break
                            case '理之冠':
                                relics['5'] = {
                                    'level': val.level,
                                    'name': val.name,
                                    'star': val.rarity,
                                    'mainId': list3[this.property_map[val.main_property.property_type].filter_name],
                                    'attrIds': val.attrIds,
                                }
                                break
                            default:
                        }
                        avatars[va.id]['artis'] = relics
                    }
                }
            }
        })
        mb.avatars = avatars
        mb._profile = new Date().getTime()
        fs.writeFileSync(path, JSON.stringify(mb), 'utf-8')
    }

    /*星铁*/
    static async sr_mys(data, uid) {
        let avatars = {}
        this.property_info = data.data.property_info
        let path = `./data/PlayerData/sr/${uid}.json`
        let mb = {
            'uid': `${uid}`,
            'avatars': {}
        }
        if (fs.existsSync(path)) {
            mb = JSON.parse(fs.readFileSync(path, 'utf8'))
        }
        data.data.avatar_list.map((v) => {
            //角色promote
            let pro, gzpro
            if (v.level > 70) pro = 6
            else if (v.level > 60) pro = 5
            else if (v.level > 50) pro = 4
            else if (v.level > 40) pro = 3
            else if (v.level > 30) pro = 2
            else if (v.level > 20) pro = 1
            else if (v.level > 0) pro = 0
            //光锥promote
            if (v.equip) {
            if (v.equip.level > 70) gzpro = 6
            else if (v.equip.level > 60) gzpro = 5
            else if (v.equip.level > 50) gzpro = 4
            else if (v.equip.level > 40) gzpro = 3
            else if (v.equip.level > 30) gzpro = 2
            else if (v.equip.level > 20) gzpro = 1
            else if (v.equip.level > 0) gzpro = 0
            }
            //处理三月七，开拓者，饮月，托帕，阮梅
            if (v.id == 1001) v.name = '三月七'
            if (v.id == 1224) v.name = '三月七·巡猎'
            if (v.id == 8001) v.name = '穹·毁灭'
            if (v.id == 8003) v.name = '穹·存护'
            if (v.id == 8005) v.name = '穹·同谐'
            if (v.id == 8007) v.name = '穹·记忆'
            if (v.id == 8002) v.name = '星·毁灭'
            if (v.id == 8004) v.name = '星·存护'
            if (v.id == 8006) v.name = '星·同谐'
            if (v.id == 8008) v.name = '星·记忆'
            if (v.id == 1213) v.name = '丹恒•饮月'
            if (v.id == 1112) v.name = '托帕&账账'
            if (v.id == 1303) v.name = '阮•梅'

            //星魂影响
            let ava
            try {
                ava = JSON.parse(fs.readFileSync(`./plugins/miao-plugin/resources/meta-sr/character/${v.name}/data.json`, 'utf-8'))
            } catch (e) {
                return 
            }
            let a = v.skills[0].level
            let e = v.skills[1].level
            let q = v.skills[2].level
            let t = v.skills[3].level
            let servant = v.servant_detail.servant_skills
            let me, mt
            if (servant.length !== 0) {
                me = servant[0].level
                mt = servant[1].level
            }
            for (let x in ava.talentCons) {
                if ((v.rank > 4 && ava.talentCons[x] == 5) || (v.rank > 2 && ava.talentCons[x] == 3)) {
                    if (servant.length !== 0) {
                        switch (x) {
                            case 'a':
                                a = a - 1
                                break
                            case 'e':
                                e = e - 2
                                break
                            case 'q':
                                q = q - 2
                                break
                            case 't':
                                t = t - 2
                                break
                            case 'me':
                                me = me - 1
                                break
                            case 'mt':
                                mt = mt - 1
                                break
                        }
                    } else {
                        switch (x) {
                            case 'a':
                                a = a - 1
                                break
                            case 'e':
                                e = e - 2
                                break
                            case 'q':
                                q = q - 2
                                break
                            case 't':
                                t = t - 2
                                break
                        }
                    }
                }
            }
            //属性
            let elem
            switch (v.element) {
                case 'ice':
                    elem = '冰'
                    break
                case 'imaginary':
                    elem = '虚数'
                    break
                case 'physical':
                    elem = '物理'
                    break
                case 'lightning':
                    elem = '雷'
                    break
                case 'fire':
                    elem = '火'
                    break
                case 'quantum':
                    elem = '量子'
                    break
                case 'wind':
                    elem = '风'
                    break
            }
            //行迹
            let trees = []
            v.skills.map((xj) => {
                if (xj.is_activated) trees.push(xj.point_id)
            })

            //遗器主词条
            let lists = {
                '3': {
                    '生命值百分比': 1,
                    '攻击力百分比': 2,
                    '防御力百分比': 3,
                    '暴击率': 4,
                    '暴击伤害': 5,
                    '治疗量加成': 6,
                    '效果命中': 7
                },
                '4': {
                    '生命值百分比': 1,
                    '攻击力百分比': 2,
                    '防御力百分比': 3,
                    '速度': 4
                },
                '5': {
                    '生命值百分比': 1,
                    '攻击力百分比': 2,
                    '防御力百分比': 3,
                    '物理属性伤害提高': 4,
                    '火属性伤害提高': 5,
                    '冰属性伤害提高': 6,
                    '雷属性伤害提高': 7,
                    '风属性伤害提高': 8,
                    '量子属性伤害提高': 9,
                    '虚数属性伤害提高': 10
                },
                '6': {
                    '生命值百分比': 3,
                    '攻击力百分比': 4,
                    '防御力百分比': 5,
                    '击破特攻': 1,
                    '能量恢复效率': 2
                }
            }
            //5星遗器副词条[id,最低位,平均差值]
            let five_list = {
                '生命值': [1, 33.87004, 4.233754],
                '攻击力': [2, 16.935019, 2.116876],
                '防御力': [3, 16.935019, 2.116876],
                '生命值百分比': [4, 3.4560002, 0.432],
                '攻击力百分比': [5, 3.4560002, 0.432],
                '防御力百分比': [6, 4.32, 0.54],
                '速度': [7, 2, 0.3],
                '暴击率': [8, 2.5919999999999996, 0.324],
                '暴击伤害': [9, 5.183999999999999, 0.648],
                '效果命中': [10, 3.4560002, 0.432],
                '效果抵抗': [11, 3.4560002, 0.432],
                '击破特攻': [12, 5.183999999999999, 0.648]
            }
            //4星遗器副词条[id,最低位,平均差值]
            let four_list = {
                '生命值': [1, 27.096031, 3.387],
                '攻击力': [2, 13.548016, 1.6935],
                '防御力': [3, 13.548016, 1.6935],
                '生命值百分比': [4, 2.7647999999999997, 0.3456],
                '攻击力百分比': [5, 2.7647999999999997, 0.3456],
                '防御力百分比': [6, 3.4560002, 0.432],
                '速度': [7, 1.6, 0.2],
                '暴击率': [8, 2.0736001, 0.2592],
                '暴击伤害': [9, 4.1472, 0.5184],
                '效果命中': [10, 2.7647999999999997, 0.3456],
                '效果抵抗': [11, 2.7647999999999997, 0.3456],
                '击破特攻': [12, 4.1472, 0.5184]
            }
            //遗器
            let artis = {}
            let yqs = [...v.relics, ...v.ornaments]
            if (yqs.length) {
                yqs.map((yq) => {
                    let flist = five_list
                    if (String(yq.id).substring(0, 1) == '5') flist = four_list
                    //attrIds
                    let attrIds = []
                    for (let v_ of yq.properties) {
                        //去% ％
                        if (v_.value.includes('%', '％')) {
                            v_.value = Number(v_.value.replace(/%|％/g, '').trim())
                        } else {
                            v_.value = Number(v_.value)
                        }
                        let at = flist[this.property_info[v_.property_type].property_name_filter]
                        let k = v_.value - at[1] * v_.times
                        let p
                        if (k <= 0) {
                            p = 0
                        } else {
                            let b = 0
                            p = k / at[2]
                            if (p.toString().indexOf('.') !== -1) {
                                b = Math.floor((p - Math.floor(p)) * 100)
                                if (b > 50) p = Math.ceil(p)
                                else p = Math.floor(p)
                            }
                        }
                        if (at[0] == 7 && at[1] == 2 && p !== 0) p = 3.3
                        attrIds.push(`${at[0]},${v_.times},${p}`)
                    }
                    artis[yq.pos] = {
                        'level': yq.level,
                        'id': yq.id,
                        'mainId': [1, 2].includes(yq.pos) ? 1 : lists[yq.pos][this.property_info[yq.main_property.property_type].property_name_filter],
                        'attrIds': attrIds
                    }
                })
            }

            //我们合体！！！
            avatars[v.id] = {
                'name': v.name,
                'id': v.id,
                'elem': elem,
                'level': v.level,
                'promote': pro,
                'cons': v.rank,
                'talent': servant.length !== 0 ? {
                    'a': a,
                    'e': e,
                    'q': q,
                    't': t,
                    'me': me,
                    'mt': mt
                } : {
                    'a': a,
                    'e': e,
                    'q': q,
                    't': t
                },
                'trees': trees,
                'weapon': v.equip ? {
                    'id': v.equip.id,
                    'level': v.equip.level,
                    'promote': gzpro,
                    'affix': v.equip.rank
                } : null,
                'artis': artis,
                '_source': 'mysPanelHSR',
                '_time': new Date().getTime(),
                '_update': new Date().getTime(),
                '_talent': new Date().getTime()
            }
        })
        mb.avatars = avatars
        mb._profile = new Date().getTime()
        fs.writeFileSync(path, JSON.stringify(mb), 'utf-8')
    }
}
