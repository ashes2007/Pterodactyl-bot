# 🎉 Complete Giveaway System Guide

## Overview
The giveaway system allows you to create, manage, and run giveaways with advanced features like requirements, bonus entries, blacklists, drop giveaways, and more.

---

## 📝 Commands Reference

### Basic Giveaway Management

#### `/giveaway start`
Create a new giveaway.

**Options:**
- `prize` (required) - What you're giving away
- `duration` (required) - Duration in minutes
- `winners` (required) - Number of winners (1-20)
- `channel` (optional) - Channel to post in (defaults to current)

**Example:**
```
/giveaway start prize:"Discord Nitro 2 Months" duration:60 winners:3
```

---

#### `/giveaway end`
Manually end a giveaway early and pick winners.

**Options:**
- `giveaway_id` (required) - The giveaway ID to end

**Example:**
```
/giveaway end giveaway_id:gw_1234567890
```

---

#### `/giveaway reroll`
Reroll a giveaway to select new winners.

**Options:**
- `giveaway_id` (required) - The giveaway ID to reroll
- `winners` (optional) - Number of winners to select (defaults to original)

**Example:**
```
/giveaway reroll giveaway_id:gw_1234567890 winners:2
```

---

### Advanced Management

#### `/giveaway pause`
Pause an active giveaway (prevents new entries).

**Options:**
- `giveaway_id` (required) - The giveaway ID to pause

**Confirmation:** Yes (button-based)

**Example:**
```
/giveaway pause giveaway_id:gw_1234567890
```

---

#### `/giveaway resume`
Resume a paused giveaway and add extra time.

**Options:**
- `giveaway_id` (required) - The giveaway ID to resume
- `add_minutes` (optional) - Extra time to add (default: 0)

**Example:**
```
/giveaway resume giveaway_id:gw_1234567890 add_minutes:30
```

---

#### `/giveaway edit`
Edit an active giveaway's details.

**Options:**
- `giveaway_id` (required) - The giveaway ID to edit
- `new_prize` (optional) - New prize description
- `add_duration` (optional) - Minutes to add to duration
- `new_winners` (optional) - New winner count

**Example:**
```
/giveaway edit giveaway_id:gw_1234567890 new_prize:"Nitro + $50 Gift Card" new_winners:5
```

---

#### `/giveaway delete`
Permanently delete a giveaway.

**Options:**
- `giveaway_id` (required) - The giveaway ID to delete

**Confirmation:** Yes (button-based)

**Note:** This deletes the giveaway message and all data permanently.

---

### Viewing & Statistics

#### `/giveaway list`
View all giveaways.

**Options:**
- `filter` (optional) - Filter by status: `active`, `ended`, `paused`, `all` (default: `all`)

**Example:**
```
/giveaway list filter:active
```

---

#### `/giveaway participants`
View all participants in a specific giveaway.

**Options:**
- `giveaway_id` (required) - The giveaway ID to view

**Example:**
```
/giveaway participants giveaway_id:gw_1234567890
```

---

#### `/giveaway stats`
View overall giveaway statistics.

**Shows:**
- Total giveaways created
- Active giveaways
- Total entries across all giveaways
- Total winners selected
- Most popular prizes
- Blacklisted users count

**Example:**
```
/giveaway stats
```

---

#### `/giveaway history`
View detailed history of past giveaways.

**Options:**
- `limit` (optional) - Number of giveaways to show (default: 10, max: 50)

**Example:**
```
/giveaway history limit:20
```

---

### Requirements & Restrictions

#### `/giveaway requirements`
Set entry requirements for a giveaway.

**Options:**
- `giveaway_id` (required) - The giveaway ID
- `required_role` (optional) - Role users must have
- `min_account_age` (optional) - Minimum Discord account age in days
- `min_server_age` (optional) - Minimum time in server in days

**Example:**
```
/giveaway requirements giveaway_id:gw_1234567890 required_role:@Member min_account_age:30
```

---

#### `/giveaway bonus`
Set bonus entries for server boosters.

**Options:**
- `giveaway_id` (required) - The giveaway ID
- `bonus_entries` (required) - Number of bonus entries (0-10)

**Example:**
```
/giveaway bonus giveaway_id:gw_1234567890 bonus_entries:5
```

**Note:** Users with Nitro boost in your server get extra entries!

---

#### `/giveaway blacklist`
Blacklist a user from entering any giveaways.

**Options:**
- `user` (required) - The user to blacklist
- `reason` (optional) - Reason for blacklist

**Example:**
```
/giveaway blacklist user:@BadUser reason:"Alt account abuse"
```

---

#### `/giveaway unblacklist`
Remove a user from the giveaway blacklist.

**Options:**
- `user` (required) - The user to unblacklist

**Example:**
```
/giveaway unblacklist user:@User
```

---

### Drop Giveaways

#### `/giveaway drop`
Create an instant drop giveaway where the first X people to click win immediately.

**Options:**
- `prize` (required) - What you're giving away
- `winners` (required) - Number of winners (first X to click)
- `channel` (optional) - Channel to post in

**Example:**
```
/giveaway drop prize:"Free Game Key" winners:5
```

**How it works:**
- First X users to click the button win instantly
- No drawing/random selection
- Giveaway ends when all spots are claimed
- Perfect for flash giveaways!

---

#### `/giveaway announce`
Repost/announce a giveaway in a different channel.

**Options:**
- `giveaway_id` (required) - The giveaway ID to announce
- `channel` (required) - Channel to announce in
- `message` (optional) - Custom announcement message

**Example:**
```
/giveaway announce giveaway_id:gw_1234567890 channel:#announcements message:"🎉 NEW GIVEAWAY!"
```

---

## 🎯 Entry System

### User Entry Process

1. User clicks "Enter Giveaway" button
2. Bot checks:
   - Is giveaway still active?
   - Is giveaway paused?
   - Is user blacklisted?
   - Has user already entered?
   - Does user meet role requirements?
   - Does user meet account age requirements?
   - Does user meet server age requirements?
3. If all checks pass:
   - User is entered
   - Bonus entries applied if server booster
   - Confirmation message sent

### Bonus Entries

Server boosters can receive bonus entries:
- Set with `/giveaway bonus`
- Boosters get 1 + bonus entries (e.g., bonus_entries:5 = 6 total)
- Shows in confirmation: "Entered with X entries (Booster Bonus)"

---

## ⚙️ Features

### ✅ Supported Features
- ✅ Standard timed giveaways
- ✅ Drop giveaways (instant winner)
- ✅ Pause/Resume functionality
- ✅ Role requirements
- ✅ Account age requirements
- ✅ Server age requirements
- ✅ Bonus entries for boosters
- ✅ User blacklist system
- ✅ Multiple winners
- ✅ Reroll winners
- ✅ Edit active giveaways
- ✅ Announcement system
- ✅ Full statistics
- ✅ Entry history tracking
- ✅ Automatic giveaway ending (every minute check)

### 🔒 Security & Validation
- Admin-only management commands
- Confirmation prompts for dangerous actions
- Duplicate entry prevention
- Blacklist enforcement
- Requirement validation
- Paused giveaway entry prevention

---

## 📊 Data Structure

Each giveaway stores:
```json
{
  "prize": "Discord Nitro",
  "winners": 3,
  "endsAt": 1234567890000,
  "channelId": "123456789",
  "messageId": "987654321",
  "hostId": "111222333",
  "entries": ["user1", "user2", "user1"],
  "active": true,
  "paused": false,
  "pausedAt": null,
  "createdAt": 1234567890000,
  "endedAt": null,
  "selectedWinners": [],
  "rerolledAt": null,
  "dropGiveaway": false,
  "requirements": {
    "requiredRole": "123456789",
    "minAccountAge": 30,
    "minServerAge": 7
  },
  "bonusEntries": 5
}
```

---

## 💡 Best Practices

### Creating Giveaways
1. Set clear, attractive prize descriptions
2. Use reasonable durations (30-120 minutes typical)
3. Consider requirements to prevent abuse
4. Set bonus entries for boosters to reward supporters

### Managing Giveaways
1. Monitor active giveaways with `/giveaway list`
2. Check participants with `/giveaway participants`
3. Use pause if you need to make changes
4. Reroll if winner doesn't claim prize

### Requirements
1. Don't make requirements too strict
2. Account age 7-30 days prevents alt abuse
3. Role requirements work great for member tiers
4. Combine multiple requirements for exclusive giveaways

### Drop Giveaways
1. Perfect for flash sales or quick prizes
2. Use lower winner counts (1-10)
3. Announce in high-traffic channels
4. Great for engagement boosts!

---

## 🐛 Troubleshooting

**Giveaway won't end?**
- Check if it's paused: `/giveaway list`
- Manually end it: `/giveaway end`

**User can't enter?**
- Check blacklist: `/giveaway stats`
- Check requirements: User may not meet role/age requirements
- Verify giveaway is active and not paused

**Button doesn't respond?**
- Bot may be offline/restarting
- Message may be from old/deleted giveaway
- Check console logs for errors

**Message says "no longer active"?**
- Giveaway has ended
- Use `/giveaway list` to see all active giveaways

---

## 📈 Statistics Example

```
📊 GIVEAWAY STATISTICS

Total Giveaways: 47
Active: 3
Paused: 1
Ended: 43

Total Entries: 1,247
Total Winners: 94
Blacklisted Users: 2

Most Popular Prizes:
1. Discord Nitro - 15 giveaways
2. Game Keys - 12 giveaways
3. Gift Cards - 8 giveaways

Average Entries: 26.5 per giveaway
Average Winners: 2 per giveaway
```

---

## 🎓 Examples

### Simple Giveaway
```
/giveaway start prize:"$10 Gift Card" duration:60 winners:1
```

### Exclusive Member Giveaway
```
/giveaway start prize:"Premium Discord Nitro" duration:120 winners:2
/giveaway requirements role:@Premium min_account_age:14
/giveaway bonus bonus_entries:3
```

### Quick Drop Giveaway
```
/giveaway drop prize:"Free Game Key" winners:10 channel:#giveaways
```

### Long-Running Giveaway
```
/giveaway start prize:"Gaming PC" duration:10080 winners:1
/giveaway requirements min_account_age:30 min_server_age:7
```

---

## 🔄 Auto-Processing

The bot automatically:
- ✅ Checks every minute for giveaways that need to end
- ✅ Ends giveaways when time expires
- ✅ Picks random winners from entries
- ✅ Updates messages with winner information
- ✅ Announces winners in the channel
- ✅ Stores history for `/giveaway history`

---

## 📞 Support

If you encounter issues:
1. Check `/giveaway list` for giveaway status
2. Use `/giveaway stats` to see overall system health
3. Check console logs for error messages
4. Verify bot has proper permissions (Send Messages, Embed Links, Use Buttons)

---

**Happy Giveaway Hosting! 🎉**