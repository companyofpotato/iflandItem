import { Debug, Texture, Texture2D } from 'UnityEngine';
import DownloadSourceData from '../Model/DownloadSourceData'
import { IFSBehaviour } from 'ifland.ScriptEngine'
import { Networking, ServerAPI } from 'ifland.PropEngine';

class LanguageData
{
    public ko : string;
    public en : string;
}
 
class ObjectData
{
    public compId : int;
    public compName : LanguageData;
    public max : int;
    public imgUrl : string;
}

class ResponseData
{
    public status : int;
    public data : ObjectData[];
}

export default class DownloadController extends IFSBehaviour
{
    public downloadSourceData : DownloadSourceData;
    
    private responseData : ResponseData;

    private IFDolLog(msg : string)
    {
        Debug.Log("[IFDol] " + msg);
    }

    public Initialize(stageCount : int, OnResult : (isSuccess : bool) => void)
    {
        ServerAPI.GetPlayItemComponentMeta(this.ProductID, 
            (result : bool, data : string) =>
            {
                this.IFDolLog("Get Component Meta : " + result);
                if(result)
                {
                    this.responseData = JSON.parse(data);
                    
                    this.IFDolLog("Get Component Meta Status : " + this.responseData.status);

                    if(this.responseData.status == 200)
                    {
                        let volumetricURLMap = new Map<string, string>();

                        let buttonURLMap = new Map<string, string>();

                        let urlDataList = this.responseData.data;
                        let dataCount = urlDataList.length;
                        let urlData : string = "";

                        for(let idx = 0;idx < dataCount;idx++)
                        {
                            urlData = urlDataList[idx].compName.ko;
                            if(urlData.includes("Button"))
                            {
                                buttonURLMap.set(urlData, urlDataList[idx].imgUrl);
                            }
                            else if(urlData.includes("Texture"))
                            {
                                volumetricURLMap.set(urlData, urlDataList[idx].imgUrl);
                            }
                        }

                        let befArray = Array.from(volumetricURLMap);
                        let aftArray = befArray.sort();

                        this.downloadSourceData.SetVolumetricTextureURLList(aftArray);

                        befArray = Array.from(buttonURLMap);
                        aftArray = befArray.sort();

                        this.downloadSourceData.SetEditButtonTextureURLList(aftArray);

                        this.downloadSourceData.ResetIsDownloaded(stageCount);
                        
                        OnResult(true);
                    }
                    else
                    {
                        OnResult(false);
                    }
                }
                else
                {
                    OnResult(false);
                }
            }
        )
    }

    public RequestButtonTexture(buttonCount : int, OnResult : (isSuccess : bool, result : string, texture : Texture, stage : int) => void)
    {
        for(let idx = 0;idx < buttonCount;idx++)
        {
            let stage = idx;
            Networking.GetTexture(this, this.downloadSourceData.GetEditButtonTextureURL(idx),
                (texture : Texture2D) =>
                {
                    OnResult(true, "", texture, stage);
                },
                (str : string) =>
                {
                    OnResult(false, str, null, stage);
                }    
            );
        }
    }

    public RequestEndingButtonTexture(ending : int, OnResult : (isSuccess : bool, result : string, texture : Texture, stage : int) => void)
    {
        Networking.GetTexture(this, this.downloadSourceData.GetEditButtonTextureURL(ending),
            (texture : Texture2D) =>
            {
                OnResult(true, "", texture, ending);
            },
            (str : string) =>
            {
                OnResult(false, str, null, ending);
            }    
        );
    }

    public RequestVolumetricTexture(stage : int, OnResult : (isSuccess : bool, result : string, texture : Texture) => void)
    {
        // ** 텍스처 캐싱 기능은 R2에 추가될 예정

        if(this.downloadSourceData.CheckIsDownloaded(stage) == false)
        {
            Networking.GetTexture(this, this.downloadSourceData.GetVolumetricTextureURL(stage),
                (texture : Texture2D) =>
                {
                    this.downloadSourceData.SetDownloaded(stage);
                    OnResult(true, "", texture);
                },
                (str : string) =>
                {
                    OnResult(false, str, null);
                }
            )
        }
        else
        {
            this.IFDolLog("Texture is already downloaded : " + stage);
            OnResult(true, "", null);
        }
    }
};