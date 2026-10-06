const fs = require('fs');
let c = fs.readFileSync('src/store/useAdInteractionStore.ts', 'utf8');

const target = `    voteAd: async (adId, userId, value, adOwnerId) => {
    const { adVotes } = get();
    const currentVote = adVotes.userVote;
    const isRemoving = currentVote === value;
    const newValue = isRemoving ? 0 : value;

    let up = adVotes.upvotes;
    let down = adVotes.downvotes;

    if (currentVote === 1) up--;
    if (currentVote === -1) down--;
    if (newValue === 1) up++;
    if (newValue === -1) down++;

    set({ adVotes: { upvotes: up, downvotes: down, userVote: newValue } });

    if (isRemoving) {
      await supabase
        .from("ad_votes")
        .delete()
        .match({ ad_id: adId, user_id: userId });
    } else {
      await supabase
        .from("ad_votes")
        .upsert({ ad_id: adId, user_id: userId, vote_value: newValue });
        
      if (newValue === 1 && adOwnerId && adOwnerId !== userId) {
        await supabase.from("notifications").insert({
          user_id: adOwnerId,
          actor_id: userId,
          ad_id: adId,
          type: "upvote",
        });
      }
    }
  },`;

c = c.replace(/voteAd: async \(adId, userId, value, adOwnerId\) => \{[\s\S]*?\}\n    \},/m, target);

fs.writeFileSync('src/store/useAdInteractionStore.ts', c);
console.log('Fixed useAdInteractionStore.ts upvote');
