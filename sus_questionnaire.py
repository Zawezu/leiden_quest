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

print(calculate_sus_score([5,1,5,2,3,3,5,1,3,1]))
print(calculate_sus_score([3,2,4,1,4,5,4,4,5,1]))
print(calculate_sus_score([3,1,4,4,1,4,1,4,1,1]))
print(calculate_sus_score([2,1,4,1,3,2,4,1,3,1]))
