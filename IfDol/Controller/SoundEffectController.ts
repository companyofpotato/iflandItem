import { IFSBehaviour } from 'ifland.ScriptEngine';
import { GameObject } from 'UnityEngine';
import SoundData from '../Model/SoundData';
import ContentSound from '../View/ContentSound';
import InteractionSound from '../View/InteractionSound';
import InteractionSoundData from '../Model/InteractionSoundData';
import LevelupSound from '../View/LevelupSound';

export default class SoundEffectController extends IFSBehaviour
{
    public modelingsObject : GameObject;
    public interactionSound : InteractionSound;
    public contentSound : ContentSound;
    public interactionSoundData : InteractionSoundData;
    public levelupSound : LevelupSound;

    private soundDataList : SoundData[];

    public Initialize()
    {
        this.soundDataList = this.modelingsObject.GetComponentsInChildren<SoundData>();
    }
    
    public PlayInteractionSound(stage : int)
    {
        let clip = this.interactionSoundData.interactionSoundClip;
        if(clip != null && clip != undefined)
        {
            this.interactionSound.PlaySound(clip);
        }
    }

    public PlayContentSound(stage : int)
    {
        let clip = this.soundDataList[stage].voiceSoundClip;
        if(clip != null && clip != undefined)
        {
            this.contentSound.PlaySound(clip);
        }
    }

    public PlayLevelupSound(stage : int)
    {
        let clip = this.soundDataList[stage].levelupSoundClip;
        if(clip != null && clip != undefined)
        {
            this.levelupSound.PlaySound(clip);
        }
    }
};