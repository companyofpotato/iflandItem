import { GameObject, Vector3 } from 'UnityEngine';
import { IFSBehaviour } from 'ifland.ScriptEngine'

export default class ConnectFourButton extends IFSBehaviour
{
    public columnIndex : int = -1;
};