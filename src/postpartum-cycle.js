const FARM_ID='72bb5d54-f614-4394-8da9-7113a8e48a29'
let running=false

function dateKey(value){return String(value||'').slice(0,10)}
function isAfterOrEqual(a,b){return Boolean(a&&b&&dateKey(a)>=dateKey(b))}

async function reconcilePostpartumCycles(){
  if(running)return
  const sb=window.lavouraSupabase
  if(!sb)return
  running=true
  try{
    const [animalsRes,reproRes]=await Promise.all([
      sb.from('animals')
        .select('id,number,last_calving_date')
        .eq('farm_id',FARM_ID),
      sb.from('reproduction')
        .select('id,animal_id,event_type,event_date,result,expected_calving,expected_dry_off')
        .eq('farm_id',FARM_ID)
        .order('event_date',{ascending:false})
    ])
    if(animalsRes.error||reproRes.error)throw animalsRes.error||reproRes.error

    const animalsById=new Map((animalsRes.data||[]).map(a=>[String(a.id),a]))
    const eventsByAnimal=new Map()
    for(const event of reproRes.data||[]){
      const key=String(event.animal_id)
      if(!eventsByAnimal.has(key))eventsByAnimal.set(key,[])
      eventsByAnimal.get(key).push(event)
    }

    const updates=[]
    for(const [animalId,events] of eventsByAnimal){
      const animal=animalsById.get(animalId)
      if(!animal)continue
      const latestCalving=events.find(e=>e.event_type==='PARTO')
      if(!latestCalving)continue

      const latestIa=events.find(e=>e.event_type==='IA')
      if(latestIa&&isAfterOrEqual(latestCalving.event_date,latestIa.event_date)){
        const needsClose=latestIa.result!=='Parto concluído'||latestIa.expected_calving||latestIa.expected_dry_off
        if(needsClose){
          updates.push(
            sb.from('reproduction')
              .update({result:'Parto concluído',expected_calving:null,expected_dry_off:null})
              .eq('farm_id',FARM_ID)
              .eq('id',latestIa.id)
          )
        }
      }

      if(dateKey(animal.last_calving_date)!==dateKey(latestCalving.event_date)){
        updates.push(
          sb.from('animals')
            .update({last_calving_date:dateKey(latestCalving.event_date)})
            .eq('farm_id',FARM_ID)
            .eq('id',animal.id)
        )
      }
    }

    if(updates.length){
      const results=await Promise.all(updates)
      const failed=results.find(r=>r.error)
      if(failed?.error)throw failed.error
    }
  }catch(error){
    console.error('Postpartum cycle reconciliation:',error)
  }finally{
    running=false
  }
}

function schedule(){queueMicrotask(reconcilePostpartumCycles)}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})
reconcilePostpartumCycles()

export { dateKey, isAfterOrEqual }
