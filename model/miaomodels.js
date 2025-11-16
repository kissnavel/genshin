import fs from 'node:fs'
import Base from '../../../plugins/miao-plugin/models/Base.js'
import Character from '../../../plugins/miao-plugin/models/Character.js'
import Artifact from '../../../plugins/miao-plugin/models/Artifact.js'
import ArtifactSet from '../../../plugins/miao-plugin/models/ArtifactSet.js'
import Abyss from '../../../plugins/miao-plugin/models/Abyss.js'
import RoleCombat from '../../../plugins/miao-plugin/models/RoleCombat.js'
import HardChallenge from '../../../plugins/miao-plugin/models/HardChallenge.js'
import Player from '../../../plugins/miao-plugin/models/Player.js'
import Avatar from '../../../plugins/miao-plugin/models/Avatar.js'
import ProfileDmg from '../../../plugins/miao-plugin/models/ProfileDmg.js'
import ProfileRank from '../../../plugins/miao-plugin/models/ProfileRank.js'
import Material from '../../../plugins/miao-plugin/models/Material.js'
import Weapon from '../../../plugins/miao-plugin/models/Weapon.js'
import User from '../../../plugins/miao-plugin/models/User.js'
import MysApi from '../../../plugins/miao-plugin/models/MysApi.js'
import Button from '../../../plugins/miao-plugin/models/Button.js'
import { miaoPath } from '../../../plugins/miao-plugin/tools/path.js'

for (let game of ['gs', 'sr']) {
  for (let type of ['artifact', 'character', 'material', 'weapon']) {
    let file = `${miaoPath}/resources/meta-${game}/${type}/index.js`
    if (fs.existsSync(file)) {
      try {
        await import(`file://${file}`)
      } catch (e) {
        console.log(e)
      }
    }
  }
}
export {
  Base,
  Abyss,
  RoleCombat,
  HardChallenge,
  Button,
  Character,
  Artifact,
  ArtifactSet,
  Avatar,
  ProfileDmg,
  ProfileRank,
  Material,
  Weapon,
  User,
  MysApi,
  Player
}
