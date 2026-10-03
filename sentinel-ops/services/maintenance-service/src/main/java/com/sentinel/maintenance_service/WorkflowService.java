package com.sentinel.maintenance_service;

import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class WorkflowService {
  private final JdbcClient db;
  public WorkflowService(JdbcClient db) { this.db = db; }
  public List<Map<String,Object>> orders() { return db.sql("SELECT id,asset_id AS asset,title,priority,status,owner,due,source,description,created_at AS \"createdAt\",resolved_at AS \"resolvedAt\",trigger_readings AS \"triggerReadings\",recommended_action AS \"recommendedAction\" FROM work_orders ORDER BY created_at DESC").query().listOfRows(); }
  public List<Map<String,Object>> parts() { return db.sql("SELECT id,name,on_hand AS \"onHand\",reorder_level AS \"reorderLevel\",unit_cost AS \"unitCost\",supplier_id AS \"supplierId\",sku,category,array_to_json(compatible_assets)::text AS \"compatibleAssets\" FROM parts ORDER BY id").query().listOfRows(); }
  public List<Map<String,Object>> rows(String table) { return db.sql("SELECT * FROM " + table + " ORDER BY created_at DESC").query().listOfRows(); }
  public Map<String,Object> order(String id) { return orders().stream().filter(w -> id.equals(w.get("id"))).findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Work order not found")); }
  public void notify(String type,String title,String message,String asset,String wo,String part) {
    db.sql("INSERT INTO notifications(type,title,message,asset_id,work_order_id,part_id) VALUES(:type,:title,:message,:asset,:wo,:part)").param("type",type).param("title",title).param("message",message).param("asset",asset).param("wo",wo).param("part",part).update();
  }
  @Transactional
  public Map<String,Object> create(Map<String,Object> input) {
    String asset = text(input,"assetId",""); String title = text(input,"title","");
    if(title.isBlank() || title.length()>200 || asset.isBlank()) bad("Asset and title are required (title up to 200 characters)");
    if(db.sql("SELECT count(*) FROM asset.assets WHERE id=:id").param("id",asset).query(Integer.class).single()==0) bad("Unknown asset");
    String priority=text(input,"priority","MEDIUM").toUpperCase();
    if(!Set.of("LOW","MEDIUM","HIGH","CRITICAL").contains(priority)) bad("Invalid priority");
    String id="WO-"+UUID.randomUUID().toString().substring(0,12);
    db.sql("INSERT INTO work_orders(id,asset_id,title,priority,status,owner,due,source,description,recommended_action) VALUES(:id,:asset,:title,:priority,'SCHEDULED',:owner,:due,'Dashboard',:description,:action)").param("id",id).param("asset",asset).param("title",title).param("priority",priority).param("owner",text(input,"owner","Unassigned")).param("due",text(input,"due","Not scheduled")).param("description",text(input,"description","")).param("action",text(input,"recommendedAction","")).update();
    notify("WORK_ORDER","Work order created",title,asset,id,null); return order(id);
  }
  @Transactional
  public Map<String,Object> update(String id,Map<String,Object> input) {
    var old=order(id); String status=text(input,"status",old.get("status").toString()).toUpperCase().replace(' ','_');
    if(!Set.of("ASSIGNED","SCHEDULED","IN_PROGRESS","RESOLVED","AUTO_GENERATED").contains(status)) bad("Invalid status");
    String owner=text(input,"owner",String.valueOf(old.get("owner")));
    if(owner.length()>80) bad("Owner exceeds 80 characters");
    db.sql("UPDATE work_orders SET status=:status,owner=:owner,updated_at=now(),assigned_at=CASE WHEN owner IS DISTINCT FROM :owner THEN now() ELSE assigned_at END,resolved_at=CASE WHEN :status='RESOLVED' THEN now() ELSE NULL END WHERE id=:id").param("status",status).param("owner",owner).param("id",id).update();
    notify("WORK_ORDER",status.equals("RESOLVED")?"Work order resolved":"Work order updated",id+" • "+status+" • "+owner,String.valueOf(old.get("asset")),id,null); return order(id);
  }
  @Transactional
  public void adjust(String id,int delta,String reason,String workOrder) {
    if(delta==0 || Math.abs((long)delta)>100000) bad("Quantity must be a nonzero integer within 100000");
    var matches=db.sql("SELECT * FROM parts WHERE id=:id FOR UPDATE").param("id",id).query().listOfRows();
    if(matches.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Part not found");
    var part=matches.getFirst();
    if(((Number)part.get("on_hand")).intValue()+delta<0) bad("Insufficient stock");
    if(workOrder!=null) {
      var wo=order(workOrder);
      if(Set.of("RESOLVED","Completed","Resolved").contains(wo.get("status"))) bad("Cannot consume parts for a resolved order");
      if(db.sql("SELECT count(*) FROM parts WHERE id=:id AND :asset=ANY(compatible_assets)").param("id",id).param("asset",wo.get("asset")).query(Integer.class).single()==0) bad("Part is not compatible with this machine");
    }
    db.sql("UPDATE parts SET on_hand=on_hand+:delta WHERE id=:id").param("delta",delta).param("id",id).update();
    db.sql("INSERT INTO inventory_movements(part_id,quantity_delta,reason,work_order_id) VALUES(:id,:delta,:reason,:wo)").param("id",id).param("delta",delta).param("reason",reason).param("wo",workOrder).update();
    notify("INVENTORY","Stock movement",id+": "+delta+" ("+reason+")",null,workOrder,id);
    if(((Number)part.get("on_hand")).intValue()+delta<=((Number)part.get("reorder_level")).intValue()) reorder(id,Math.max(1,((Number)part.get("reorder_level")).intValue()*2-(((Number)part.get("on_hand")).intValue()+delta)));
  }
  @Transactional
  public void reorder(String id,int quantity) {
    if(quantity<1 || quantity>100000) bad("Reorder quantity must be between 1 and 100000");
    int count=db.sql("INSERT INTO supplier_orders(part_id,supplier_id,quantity,estimated_cost) SELECT id,supplier_id,:q,unit_cost*:q FROM parts WHERE id=:id ON CONFLICT DO NOTHING").param("q",quantity).param("id",id).update();
    if(count>0) notify("INVENTORY","Supplier reorder suggested",quantity+" units of "+id+"; procurement review required",null,null,id);
  }
  public static String text(Map<String,Object> input,String key,String fallback) { Object value=input.get(key); return value==null?fallback:value.toString().trim(); }
  public static void bad(String message) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,message); }
}
