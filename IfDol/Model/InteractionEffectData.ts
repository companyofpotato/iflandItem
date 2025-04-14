import { IFSBehaviour } from 'ifland.ScriptEngine'
import { Coroutine, Debug, GameObject, Mathf, ParticleSystem, ParticleSystemCurveMode, WaitForSeconds } from 'UnityEngine';

export default class InteractionEffectData extends IFSBehaviour
{
    public interactionParticleObject : GameObject;
    
    private effectCoroutine : Coroutine;
    private waitForSeconds : WaitForSeconds;
    private interactionParticleSystem : ParticleSystem;
    private effectSecond : float;

    public Initialize()
    {
        this.interactionParticleSystem = this.interactionParticleObject.GetComponent<ParticleSystem>();
        
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
        this.waitForSeconds = new WaitForSeconds(this.effectSecond);
        this.effectCoroutine = null;
        this.interactionParticleObject.SetActive(false);
    }

    public GetEffectSecond() : float
    {
        return this.effectSecond;
    }

    public PlayEffect()
    {
        this.effectCoroutine = this.StartCoroutine(this.EffectPlayingCoroutine);
    }

    public StopEffect()
    {
        if(this.effectCoroutine != null)
        {
            this.StopCoroutine(this.effectCoroutine);
            this.effectCoroutine = null;
            
            this.interactionParticleObject.SetActive(false);
            // this.interactionParticleSystem.Stop();
        }
    }

    private *EffectPlayingCoroutine()
    {
        this.interactionParticleObject.SetActive(false);
        this.interactionParticleObject.SetActive(true);
        // this.interactionParticleSystem.Stop();
        this.interactionParticleSystem.Play();

        yield this.waitForSeconds;
        
        this.interactionParticleObject.SetActive(false);
        // this.interactionParticleSystem.Stop();
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