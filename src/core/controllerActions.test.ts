import {test} from 'node:test'
import assert from 'node:assert/strict'
import {LokInput} from '../../lib/lok-input/src/index.js'
import {controllerActions} from './controllerActions'
import {PONG_MAP} from './controllerPanel'
import {createWorld,issue,stepWorld} from '../sim/world'
const pad=(index:number,pressed:number[]=[])=>({index,id:'test'+index,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i),value:pressed.includes(i)?1:0,touched:false}))}) as unknown as Gamepad
test('two gamepads record commands for separate versus players and never take over AI',()=>{
 const input=new LokInput({maxPlayers:2,map:PONG_MAP});input.poll([pad(2,[0]),pad(5,[0])]);input.poll([pad(2),pad(5)])
 const frames=input.poll([pad(2,[0]),pad(5,[0])]);const commands=frames.flatMap(frame=>controllerActions(frame,false,false))
 assert.deepEqual(commands,[{k:'thrust',side:0},{k:'thrust',side:1}])
 assert.deepEqual(controllerActions(frames[1]!,true,false),[])
 assert.deepEqual(controllerActions(frames[0]!,false,true),[])
 const world=createWorld({mode:'versus',arenas:0},123)
 for(const command of commands)issue(world,command)
 stepWorld(world)
 assert.ok(world.sides[0].thrustReadyTick>0);assert.ok(world.sides[1].thrustReadyTick>0)
 assert.equal(input.poll([pad(2,[0]),pad(5,[0])]).flatMap(frame=>controllerActions(frame,false,false)).length,0,'held buttons do not spam commands')
})
