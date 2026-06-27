import { useState, useEffect } from "react";
import { getJobs } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, DollarSign, Briefcase } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

const JobListing = () => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getJobs()
            .then((data) => {
                setJobs(data || []);
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8 text-center">Loading jobs...</div>;

    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-6">Explore Jobs</h1>

            {jobs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/20 border-dashed">
                    <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                    <h3 className="text-lg font-medium">No active job postings</h3>
                    <p className="text-sm text-muted-foreground">Check back later for new opportunities.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {jobs.map((job) => (
                        <Card key={job._id || job.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <CardTitle className="text-xl line-clamp-1">{job.title}</CardTitle>
                                        <p className="text-sm text-muted-foreground font-medium mt-1">
                                            {job.business_name}
                                        </p>
                                    </div>
                                    <Badge variant={job.type === 'Full-time' ? 'default' : 'secondary'}>
                                        {job.type}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-between gap-4">
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4" /> {job.location}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4" /> {job.salary}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" /> Posted {formatDistanceToNow(new Date(job.posted_at))} ago
                                    </div>
                                </div>

                                <p className="text-sm line-clamp-3 mb-2">{job.description}</p>

                                <div className="mt-auto pt-2">
                                    <Button className="w-full" asChild>
                                        <Link to={`/jobs/${job._id || job.id}`}>View Details</Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default JobListing;
