import { AudioSource } from 'UnityEngine';
import { IFSBehaviour } from 'ifland.ScriptEngine'

export default class ConnectFourChip extends IFSBehaviour
{
    public chipSound : AudioSource;

    CreationEndCallback : () => void;

    PlaySoundEvent()
    {
        this.chipSound.Play();
    }

    CreationEndEvent()
    {
        this.CreationEndCallback();
    }
};