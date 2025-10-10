import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Heart, MessageCircle, Trophy, TrendingUp, Users } from "lucide-react";

interface StatCard {
  title: string;
  value: string;
  change: string;
  icon: any;
  color: string;
}

interface TopFriend {
  name: string;
  avatar: string;
  eventsAttended: number;
  lastEvent: string;
}

export function FriendStats() {
  const stats: StatCard[] = [
    {
      title: "Total Friends",
      value: "142",
      change: "+12 this month",
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Events Together",
      value: "67",
      change: "+8 this month",
      icon: Calendar,
      color: "text-green-500",
    },
    {
      title: "Messages Sent",
      value: "1,234",
      change: "+156 this week",
      icon: MessageCircle,
      color: "text-purple-500",
    },
    {
      title: "Engagement Score",
      value: "94%",
      change: "+5% this month",
      icon: TrendingUp,
      color: "text-orange-500",
    },
  ];

  const topFriends: TopFriend[] = [
    {
      name: "Ahmed Al-Rashid",
      avatar: "",
      eventsAttended: 23,
      lastEvent: "Desert Safari - Yesterday",
    },
    {
      name: "Sara Mohammed",
      avatar: "",
      eventsAttended: 18,
      lastEvent: "Hiking Trip - 3 days ago",
    },
    {
      name: "Omar Hassan",
      avatar: "",
      eventsAttended: 15,
      lastEvent: "Beach Cleanup - Last week",
    },
  ];

  const achievements = [
    { title: "Social Butterfly", description: "Made 50+ friends", icon: "🦋" },
    { title: "Event Master", description: "Attended 50+ events together", icon: "🎯" },
    { title: "Team Player", description: "Joined 10+ group activities", icon: "⚽" },
    { title: "Conversation King", description: "Sent 1000+ messages", icon: "👑" },
  ];

  const monthlyActivity = [
    { month: "Jan", events: 4 },
    { month: "Feb", events: 7 },
    { month: "Mar", events: 5 },
    { month: "Apr", events: 9 },
    { month: "May", events: 8 },
    { month: "Jun", events: 11 },
  ];

  const maxEvents = Math.max(...monthlyActivity.map(m => m.events));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Friend Statistics</h2>
        <p className="text-muted-foreground">
          Track your friendships and engagement
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card/50 backdrop-blur-sm border-2 hover:border-primary/50"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Friends */}
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top Friends
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topFriends.map((friend, index) => (
              <div
                key={friend.name}
                className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60">
                      {friend.name.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                    {index + 1}
                  </Badge>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">{friend.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {friend.lastEvent}
                  </p>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {friend.eventsAttended} events
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {achievements.map((achievement) => (
              <div
                key={achievement.title}
                className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
              >
                <span className="text-3xl">{achievement.icon}</span>
                <div>
                  <h4 className="font-semibold">{achievement.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {achievement.description}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart */}
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Events Attended Together (Last 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-4 h-64">
            {monthlyActivity.map((data) => (
              <div key={data.month} className="flex flex-col items-center flex-1 gap-2">
                <div className="relative w-full flex items-end justify-center">
                  <div
                    className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t-lg transition-all duration-500 hover:from-primary/80 hover:to-primary/40"
                    style={{
                      height: `${(data.events / maxEvents) * 200}px`,
                      minHeight: "20px",
                    }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-sm font-bold px-2 py-1 rounded">
                      {data.events}
                    </div>
                  </div>
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {data.month}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
