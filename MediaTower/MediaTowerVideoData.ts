export default class MediaTowerVideoData
{
    private length : int;
    private urlList : Array<string>;
    private noList : Array<int>;

    Reset()
    {
        this.length = 0;
        this.urlList = new Array<string>();
        this.noList = new Array<int>();
    }

    GetLength() : int
    {
        return this.length;
    }

    GetURLList() : Array<string>
    {
        return this.urlList;
    }

    GetURLByIdx(idx : int) : string
    {
        return this.urlList[idx];
    }

    GetNoList() : Array<int>
    {
        return this.noList;
    }

    GetNoByIdx(idx : int) : int
    {
        return this.noList[idx];
    }

    Push(no : int, url : string)
    {
        this.length++;
        this.urlList.push(url);
        this.noList.push(no);
    }

    SetStartIdxByNo(no : int) : int
    {
        if(no < 0)
        {
            return 0;
        }

        var res = 0;
        for(var idx = 0;idx < this.noList.length;idx++)
        {
            if(no == this.noList[idx])
            {
                res = idx;
                break;
            }
        }

        return res;
    }
};