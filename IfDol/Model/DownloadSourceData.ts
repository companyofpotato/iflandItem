import { IFSBehaviour } from 'ifland.ScriptEngine'

export default class DownloadSourceData extends IFSBehaviour
{
    private volumetricTextureURLList : string[][];
    private editButtonTextureURLList : string[][];
    private isDownloaded : bool[];

    public ResetIsDownloaded(count : int)
    {
        this.isDownloaded = new Array(count);
        for(let idx = 0;idx < count;idx++)
        {
            this.isDownloaded[idx] = false;
        }
    }

    public SetDownloaded(idx : int)
    {
        this.isDownloaded[idx] = true;
    }

    public CheckIsDownloaded(idx : int) : bool
    {
        if(idx >= this.isDownloaded.length)
        {
            return true;
        }
        else
        {
            return this.isDownloaded[idx];
        }
    }

    public SetVolumetricTextureURLList(list : string[][])
    {
        this.volumetricTextureURLList = list;
    }

    public SetEditButtonTextureURLList(list : string[][])
    {
        this.editButtonTextureURLList = list;
    }
    
    public GetVolumetricTextureURL(idx : int) : string
    {
        return this.volumetricTextureURLList[idx][1];
    }

    public GetEditButtonTextureURL(idx : int) : string
    {
        return this.editButtonTextureURLList[idx][1];
    }
};