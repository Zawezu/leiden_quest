def calculate_sus_score(items):
    if len(items) != 10:
        raise Exception
    total_score = 0

    for i, item in enumerate(items):
        if i in {0,2,4,6}:
            score = item - 1
        else:
            score = 5 - item
        
        total_score += score

    total_score *= 2.5

    return total_score

# Evaluation 1

# print(calculate_sus_score([5,1,5,2,3,3,5,1,3,1]))
# print(calculate_sus_score([3,2,4,1,4,5,4,4,5,1]))
# print(calculate_sus_score([3,1,4,4,1,4,1,4,1,1]))
# print(calculate_sus_score([2,1,4,1,3,2,4,1,3,1]))

# Evaluation 2
responses = [[4,4,5,1,4,1,4,3,3,2], # Google Forms
            [5,2,5,1,5,1,5,1,5,2], # Google Forms
            [3,1,4,1,3,1,5,1,4,2], # Google Forms
            [4,2,4,1,3,2,5,2,4,2], # Google Forms
            [4,1,5,1,5,2,4,1,5,1], # Google Forms
            [2,2,5,1,5,1,5,3,4,1], # Google Forms
            [4,1,5,2,4,2,5,1,4,2], # Google Forms
            [4,1,4,1,3,2,5,1,4,1], # pdf
            [2,2,4,1,5,1,4,3,5,1], # Google Forms
            [1,2,5,1,5,1,5,1,5,1], # Google Forms
            [1,2,5,1,5,1,5,1,5,1]] # Google Forms

print(f"{len(responses)} responses")

cum_score = 0
for response in responses:
    sus_score = calculate_sus_score(response)
    print(sus_score)

    cum_score += sus_score

cum_score /= len(responses)
print(f"Average score: {cum_score}")
