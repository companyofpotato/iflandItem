import { IFSBehaviour } from 'ifland.ScriptEngine'
import { AudioClip, AudioSource } from 'UnityEngine'

export default class SoundObject extends IFSBehaviour
{
    public audioSource : AudioSource;

    public PlaySound(clip : AudioClip)
    {
        this.audioSource.Stop();
        this.audioSource.clip = clip;
        this.audioSource.spatialBlend = 0;
        this.audioSource.Play();
    }
};