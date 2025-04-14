import { Material, Mathf, Mesh, MeshCollider, MeshFilter, MeshRenderer, Vector2, Vector3 } from 'UnityEngine';
import { IFSBehaviour } from 'ifland.ScriptEngine'

enum ConeOrientation
{
    X,
    Y,
    Z
}

export default class ConnectFourCone extends IFSBehaviour
{
    public _coneMesh : Mesh;
    public _meshFilter : MeshFilter;
    public _meshRenderer : MeshRenderer;
    public _meshCollider : MeshCollider;

    private _privotTop : bool = true;
    private _orientation : ConeOrientation = ConeOrientation.Y;
    private _invertDirection : bool = false;
    private _isTrigger : bool = false;
    public _material : Material;
    private _coneSides : int = 25;
    private _proportionalRadius : bool = false;
    private _coneRadius : float = 0.5;
    private _coneHeight : float = 1.0;

    Awake()
    {
        this.GenerateCone();
    }

    private GenerateCone()
    {
        this._coneMesh = this.CreateConeMesh(this._coneSides + 1, this._coneRadius, this._coneHeight, this._privotTop, this._orientation, this._invertDirection, this._proportionalRadius)
        
        this._meshFilter.sharedMesh = this._coneMesh;

        this._meshRenderer.additionalVertexStreams = this._coneMesh;
        this._meshRenderer.material = this._material;
        this._meshCollider.sharedMesh = this._coneMesh;
        this._meshCollider.convex = true;
        this._meshCollider.isTrigger = this._isTrigger;
    }

    private CreateConeMesh(subdivisions : int, radius : float, height : float, pivotAtTop : bool, orientation : ConeOrientation, invertDirection : bool, proportionalRadius : bool) : Mesh
    {
        if (proportionalRadius)
        {
            radius *= height;
        }
        if (invertDirection)
        {
            height = -height;
        }
        var mesh = new Mesh();
        var vertices : Vector3[] = [];
        for(var i = 0;i < subdivisions + 2;i++)
        {
            vertices.push(Vector3.zero);
        }

        var uv :Vector2[] = [];
        for(var i = 0;i < vertices.length;i++)
        {
            uv.push(Vector2.zero);
        }

        var triangles : int[] = [];
        for(var i = 0;i < (subdivisions * 2) * 3;i++)
        {
            triangles.push(0);
        }


        if (orientation == ConeOrientation.X)
        {
            if(pivotAtTop)
            {
                vertices[0] = new Vector3(height, 0, 0);
            }
            else
            {
                vertices[0] = Vector3.zero;
            }
        }
        else if (orientation == ConeOrientation.Y)
        {
            if(pivotAtTop)
            {
                vertices[0] = new Vector3(0, height, 0);
            }
            else
            {
                vertices[0] = Vector3.zero;
            }
        }
        else
        {
            if(pivotAtTop)
            {
                vertices[0] = new Vector3(0, 0, height);
            }
            else
            {
                vertices[0] = Vector3.zero;
            }
        }

        uv[0] = new Vector2(0.5, 0);
        var n = subdivisions - 1;
        for (var i = 0; i < subdivisions; i++)
        {
            var ratio : float = i / n;
            var r = ratio * (Mathf.PI * 2);
            var x = Mathf.Cos(r) * radius;
            var z = Mathf.Sin(r) * radius;
            if (orientation == ConeOrientation.X)
            {
                vertices[i + 1] = new Vector3(pivotAtTop ? height : 0, x, z);
            }
            else if (orientation == ConeOrientation.Y)
            {
                vertices[i + 1] = new Vector3(x, pivotAtTop ? height : 0, z);
            }
            else
            {
                vertices[i + 1] = new Vector3(x, z, pivotAtTop ? height : 0);
            }
            uv[i + 1] = new Vector2(ratio, 0);
        }

        if (orientation == ConeOrientation.X)
        {
            if(pivotAtTop)
            {
                vertices[subdivisions + 1] = Vector3.zero;
            }
            else
            {
                vertices[subdivisions + 1] = new Vector3(height, 0, 0);
            }
        }
        else if (orientation == ConeOrientation.Y)
        {
            if(pivotAtTop)
            {
                vertices[subdivisions + 1] = Vector3.zero;
            }
            else
            {
                vertices[subdivisions + 1] = new Vector3(0, height, 0);
            }
        }
        else
        {
            if(pivotAtTop)
            {
                vertices[subdivisions + 1] = Vector3.zero;
            }
            else
            {
                vertices[subdivisions + 1] = new Vector3(0, 0, height);
            }
        }
        uv[subdivisions + 1] = new Vector2(0.5, 1);

        // base

        for (var i = 0; i < n; i++)
        {
            var offset = i * 3;
            triangles[offset] = 0;
            triangles[offset + 1] = i + 1;
            triangles[offset + 2] = i + 2;
        }

        // sides

        var bottomOffset = subdivisions * 3;
        for (var i = 0; i < n; i++)
        {
            var offset = i * 3 + bottomOffset;
            triangles[offset] = i + 1;
            triangles[offset + 1] = subdivisions + 1;
            triangles[offset + 2] = i + 2;
        }

        mesh.vertices = vertices;
        mesh.uv = uv;

        var intArray : any = new Int32Array(triangles);

        mesh.triangles = intArray;
        mesh.RecalculateBounds();
        mesh.RecalculateNormals();

        return mesh;
    }
};