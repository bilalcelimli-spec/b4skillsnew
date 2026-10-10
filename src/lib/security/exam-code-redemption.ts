import type {PrismaClient} from '@prisma/client';

export class CodeRedemptionError extends Error {
  constructor(public status:number, message:string, public errorCode=message) {super(message);}
}
interface RedemptionInput {
  code:string; email:string; name?:string; surname?:string; school?:string; className?:string;
  authenticatedUserId:string|null;
}
/** Claim, register and persist the login together: failures must not consume a code. */
export async function redeemExamCode(db:PrismaClient,input:RedemptionInput,issueTokens:(userId:string)=>{accessToken:string;refreshToken:string}) {
  const email=input.email.trim().toLowerCase(),code=input.code.trim().toUpperCase();
  for(let attempt=0;attempt<3;attempt++) {
    try {
      return await db.$transaction(async tx=>{
        const existing=await tx.user.findUnique({where:{email}});
        if(existing) {
          if(existing.role!=='CANDIDATE') throw new CodeRedemptionError(403,'This account cannot redeem candidate exam codes');
          if(input.authenticatedUserId!==existing.id) throw new CodeRedemptionError(409,'Sign in to the existing account before redeeming this code.','account_login_required');
        }
        const examCode=await tx.examCode.findUnique({where:{code}});
        if(!examCode) throw new CodeRedemptionError(404,'Code not found');
        const now=new Date();
        if(examCode.expiresAt && examCode.expiresAt<=now) throw new CodeRedemptionError(400,'Code has expired');
        const claimed=await tx.examCode.updateMany({
          where:{code,isUsed:false,OR:[{expiresAt:null},{expiresAt:{gt:now}}]},
          data:{isUsed:true,usedByEmail:email,usedAt:now},
        });
        if(claimed.count!==1) throw new CodeRedemptionError(400,'Code already used');
        const name=[input.name,input.surname].filter(Boolean).join(' ').trim();
        // The code always references an existing organization through its foreign key.
        // Never upsert an account found after the ownership check: a racing create
        // must roll back rather than granting access to that account.
        const user=existing
          ? await tx.user.update({where:{id:existing.id},data:{...(name?{name}:{}),organizationId:examCode.organizationId}})
          : await tx.user.create({data:{email,name:name||null,organizationId:examCode.organizationId,role:'CANDIDATE'}});
        await tx.candidateProfile.upsert({where:{userId:user.id},update:{metadata:{school:input.school,className:input.className}},create:{userId:user.id,metadata:{school:input.school,className:input.className}}});
        const tokens=issueTokens(user.id);
        await tx.user.update({where:{id:user.id},data:{refreshToken:tokens.refreshToken}});
        return {success:true as const,organizationId:examCode.organizationId,productLine:examCode.productLine,candidateId:user.id,displayName:user.name,...tokens};
      },{isolationLevel:'Serializable'});
    } catch(error) {
      const code=(error as {code?:string})?.code;
      if(code==='P2034') {
        if(attempt<2) continue;
        throw new CodeRedemptionError(503,'Code redemption is temporarily busy. Please try again.');
      }
      if(code==='P2002') throw new CodeRedemptionError(409,'Sign in to the existing account before redeeming this code.','account_login_required');
      throw error;
    }
  }
  throw new CodeRedemptionError(503,'Please retry code redemption.');
}
