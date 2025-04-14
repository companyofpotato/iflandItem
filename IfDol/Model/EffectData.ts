import { IFSBehaviour } from 'ifland.ScriptEngine'
import { Animator, Coroutine, Debug, GameObject, Mathf, ParticleSystem, ParticleSystemCurveMode, WaitForSeconds } from 'UnityEngine'

export default class EffectData extends IFSBehaviour
{
    public contentParticleObject : GameObject;
    public animator : Animator;

    private effectCoroutine : Coroutine;
    private animCoroutine : Coroutine;
    private waitForEffect : WaitForSeconds;
    private waitForAnim : WaitForSeconds;
    private contentParticleSystem : ParticleSystem;
    private effectSecond : float;
    private animSecond : float;

    public Initialize()
    {
        this.contentParticleSystem = this.contentParticleObject.GetComponent<ParticleSystem>();

        this.animSecond = this.animator.runtimeAnimatorController.animationClips[0].length;
        
        let maxEndTime = 0.0;
        let particleSystems = this.GetComponentsInChildren<ParticleSystem>();
        if (particleSystems.length > 0)
        {
            let maxLifetime = 0.0;
            let totalDuration = 0.0;

            for (let particleSystem of particleSystems)
            {
                if (particleSystem != null)
                {
                    let mainModule = particleSystem.main;
                    let lifetimeCurve = mainModule.startLifetime;
                    maxLifetime = this.GetMaxCurvetime(lifetimeCurve);
                    let startDelay = this.GetMaxCurvetime(mainModule.startDelay);
                    totalDuration = startDelay + Mathf.Max(mainModule.duration, maxLifetime);

                    if (totalDuration > maxEndTime)
                    {
                        maxEndTime = totalDuration;
                    }
                }
            }
        }

        this.effectSecond = maxEndTime;

        this.waitForEffect = new WaitForSeconds(this.effectSecond);
        this.waitForAnim = new WaitForSeconds(this.animSecond);

        this.effectCoroutine = null;
        this.contentParticleObject.SetActive(false);
        this.animator.enabled = false;
    }

    public GetEffectSecond() : float
    {
        return this.effectSecond;
    }

    public GetAnimationSecond() : float
    {
        return this.animSecond;
    }

    public PlayEffect()
    {
        this.effectCoroutine = this.StartCoroutine(this.EffectPlayingCoroutine);
    }

    public PlayAnimation()
    {
        this.animCoroutine = this.StartCoroutine(this.AnimationPlayingCoroutine);
    }

    public StopEffect()
    {
        if(this.effectCoroutine != null)
        {
            this.StopCoroutine(this.effectCoroutine);
            this.effectCoroutine = null;

            this.contentParticleObject.SetActive(false);
            // this.contentParticleSystem.Stop();
        }
    }

    public StopAnimation()
    {
        if(this.animCoroutine != null)
        {
            this.StopCoroutine(this.animCoroutine);
            this.animCoroutine = null;

            this.animator.enabled = false;
        }
    }

    private *EffectPlayingCoroutine()
    {
        this.contentParticleObject.SetActive(false);
        this.contentParticleObject.SetActive(true);
        // this.contentParticleSystem.Stop();
        this.contentParticleSystem.Play();

        yield this.waitForEffect;
        
        this.contentParticleObject.SetActive(false);
        // this.contentParticleSystem.Stop();
        this.animator.enabled = false;
        this.effectCoroutine = null;
    }

    private *AnimationPlayingCoroutine()
    {
        this.animator.enabled = true;

        yield this.waitForAnim;

        this.animator.enabled = false;
        this.animCoroutine = null;
    }
    
    GetMaxCurvetime(curve: ParticleSystem.MinMaxCurve): float
    {
        // life time curve Type
        switch (curve.mode)
        {
            case ParticleSystemCurveMode.Constant:
                return curve.constant;
            case ParticleSystemCurveMode.TwoConstants:
                return Mathf.Max(curve.constantMin, curve.constantMax);
            case ParticleSystemCurveMode.Curve:
                return curve.curveMax.keys[curve.curveMax.length - 1].time;
            case ParticleSystemCurveMode.TwoCurves:
                let maxTime1 = curve.curveMin.keys[curve.curveMin.length - 1].time;
                let maxTime2 = curve.curveMax.keys[curve.curveMax.length - 1].time;
                return Mathf.Max(maxTime1, maxTime2);
            default:
                return 0;
        }
    }
};