import { AvatarInteractionObject } from 'ifland.PropEngine';
import { IFSBehaviour } from 'ifland.ScriptEngine'
import { Vector2 } from 'UnityEngine';
import { EVehicleState } from './VehicleTemplate';

export default class VehicleController extends IFSBehaviour
{
    // 아바타 탑승
    public OnMountVehicle(avatar: AvatarInteractionObject, passengerCount: int, isOperator: bool) { }

    // 아바타 하차
    public OnDismountVehicle(avatar: AvatarInteractionObject, passengerCount: int, isOperator: bool) { }

    // Event Tick
    public OnFixedUpdate(fixedDeltaTime: float, state: EVehicleState, planDistance: float, isGrounded: bool) { }

    public OnEventJoystickUpdate(inputVector: Vector2) { }

    public OnEventJoystickStop() { }

    public OnEventJumpUp() { }

    public OnEventJumpDown() { }

    public OnEventJumpPress() { }

    public OnEventJumpClick() { }
};