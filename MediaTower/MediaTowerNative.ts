import { ECompareToken, IFSBehaviour } from 'ifland.ScriptEngine';
import { Debug } from 'UnityEngine';
import { Lab, Native, Audio, Media } from 'ifland.PropEngine';

export default class MediaTowerNative extends IFSBehaviour
{
    ShortFormEditCallback : (key : string, id : int) => void;
    SoundModeChangeCallback : (isMute : bool) => void;
    ListenToSoundModeChangeCallback : (isListenToSound : bool) => void;

    TowerLog(str : string)
    {
        Debug.Log("PIID : " + this.PropInstaceID + " [MediaTower] " + str);
    }

    TowerLogError(str : string)
    {
        Debug.LogError("PIID : " + this.PropInstaceID + " [MediaTower] " + str);
    }

    Initialize()
    {
        if($CompareVersion("1.2.6", ECompareToken.Equal) || $CompareVersion("1.2.6", ECompareToken.OrLess))
        {
            Lab.OnChangedContent += this.ContentChanged;
        }
        else
        {
            Lab.OnChangedPostContent.AddListener(this.ContentChanged);
        }
        Media.MediaStatusChangeEvent += this.SoundModeChanged;
        Audio.OnNotifyLocalMuteState += this.LocalMuteChanged;
    }

    ContentChanged(commandKey : string, num : number)
    {
        this.TowerLog("CommandKey : " + commandKey + " ID : " + num);
        this.ShortFormEditCallback(commandKey, num);
    }

    SoundModeChanged(isMute : bool)
    {
        this.TowerLog("Sound Mode Changed to " + isMute);
        this.SoundModeChangeCallback(isMute);
    }

    LocalMuteChanged(isListenToSound : bool)
    {
        this.TowerLog("ListenToSound Mode Changed To " + isListenToSound);
        this.ListenToSoundModeChangeCallback(isListenToSound);
    }

    ShowShortForm(shortFormId : number)
    {
        this.TowerLog("ShowShortForm ID : " + shortFormId);
        if(shortFormId < 0)
        {
            Native.ShowToast(this, this.GetEmptyShortFormText());
        }
        else
        {
            let json = {
                eventName : "SHOW_NATIVE_UI",
                parameters : {
                    target : "SHORTFORM",
                    option : shortFormId.toString()
                }
            };

            let req = Native.RequestToNative(this, JSON.stringify(json));
            req.OnAck((jsonData) => {
                let data = JSON.parse(jsonData);
                this.TowerLog("ack state : " + data.state + ", InstanceID : " + data.response.instanceId);
            });
        }
    }

    CheckAudioOn() : bool
    {
        this.TowerLog("ListenToSound : " + Audio.IsListenToSound);
        return Audio.IsListenToSound;
    }

    ShowAudioRetryToast()
    {
        Native.ShowToast(this, this.GetSoundguideText());
    }

    GetEmptyShortFormText() : string
    {
        return Lab.GetMultilingualText("playitem_item_mediatower_shotform_empty");
    }

    GetSoundguideText() : string
    {
        return Lab.GetMultilingualText("playitem_item_mediatower_soundguide");
    }
}